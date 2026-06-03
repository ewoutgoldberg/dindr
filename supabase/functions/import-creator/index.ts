// Edge function: scrape a creator URL (Instagram, TikTok, YouTube, website) and
// extract structured creator profile data via Lovable AI.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ExtractedCreator {
  name: string;
  handle: string;
  bio: string;
  story: string;
  specialty: string;
  location: string;
  avatar_url: string | null;
  cover_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
}

const stripHtml = (html: string): string => {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = cleaned.replace(/<[^>]+>/g, " ");
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
};

const metaContent = (html: string, prop: string): string | null => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  return html.match(re)?.[1] ?? null;
};

const guessHandle = (url: string): string => {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return seg.replace(/^@/, "").toLowerCase();
  } catch {
    return "";
  }
};

const guessSocial = (url: string) => {
  const out: Partial<ExtractedCreator> = {};
  const host = (() => {
    try { return new URL(url).hostname; } catch { return ""; }
  })();
  if (/instagram\.com/i.test(host)) out.instagram_url = url;
  else if (/tiktok\.com/i.test(host)) out.tiktok_url = url;
  else if (/youtube\.com|youtu\.be/i.test(host)) out.youtube_url = url;
  else out.website_url = url;
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let html = "";
    let ogImage: string | null = null;
    let ogTitle: string | null = null;
    let ogDesc: string | null = null;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; DindrBot/1.0; +https://dindr.lovable.app)",
        },
      });
      if (res.ok) {
        html = await res.text();
        ogImage = metaContent(html, "og:image");
        ogTitle = metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
        ogDesc = metaContent(html, "og:description") ?? metaContent(html, "description");
      }
    } catch (e) {
      console.warn("[import-creator] fetch failed", e);
    }

    const pageText = stripHtml(html).slice(0, 8000);
    const fallback = guessSocial(url);
    const handleHint = guessHandle(url);

    const prompt = `Extract a food creator / chef profile from the page content below.
URL: ${url}
OG title: ${ogTitle ?? ""}
OG description: ${ogDesc ?? ""}
Handle hint from URL: ${handleHint}

Return strictly valid JSON matching this schema (no markdown, no commentary):
{
  "name": string (display name of the person or brand),
  "handle": string (lowercase, no @, no spaces; use the URL hint if reasonable),
  "bio": string (1 short sentence, max 140 chars),
  "story": string (2-4 sentences about their cooking background, style, mission),
  "specialty": string (cuisine or food niche, e.g. "Italian pasta", "Plant-based desserts"),
  "location": string (city/country if known, else ""),
  "avatar_url": string|null (profile picture if found),
  "cover_url": string|null (banner/cover image if found),
  "instagram_url": string|null,
  "tiktok_url": string|null,
  "youtube_url": string|null,
  "website_url": string|null
}
If unsure about a field, use "" for strings or null for URLs. Never invent social URLs.

PAGE CONTENT:
${pageText}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You extract structured food-creator profile data from messy web page text. Reply with raw JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("[import-creator] AI error", aiRes.status, text);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway: ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    let content: string = aiJson.choices?.[0]?.message?.content ?? "";
    content = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

    let parsed: ExtractedCreator;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("[import-creator] JSON parse failed:", content.slice(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    // Merge fallbacks
    const merged: ExtractedCreator = {
      name: parsed.name || ogTitle || "",
      handle: (parsed.handle || handleHint || "").replace(/^@/, "").toLowerCase(),
      bio: parsed.bio || ogDesc || "",
      story: parsed.story || "",
      specialty: parsed.specialty || "",
      location: parsed.location || "",
      avatar_url: parsed.avatar_url || ogImage,
      cover_url: parsed.cover_url || null,
      instagram_url: parsed.instagram_url || fallback.instagram_url || null,
      tiktok_url: parsed.tiktok_url || fallback.tiktok_url || null,
      youtube_url: parsed.youtube_url || fallback.youtube_url || null,
      website_url: parsed.website_url || fallback.website_url || null,
    };

    return new Response(JSON.stringify({ creator: merged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[import-creator] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
