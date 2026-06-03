// Edge function: scrape a URL and extract a structured recipe via Lovable AI.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ExtractedRecipe {
  title: string;
  description: string;
  image_url: string | null;
  category: string;
  cuisine: string;
  difficulty: string;
  cooking_time_minutes: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
}

const stripHtml = (html: string): string => {
  // Remove script & style blocks
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // Drop tags
  const text = cleaned.replace(/<[^>]+>/g, " ");
  // Decode common entities and collapse whitespace
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

const extractOgImage = (html: string): string | null => {
  const m = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );
  return m?.[1] ?? null;
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

    // 1. Fetch the page HTML
    let html = "";
    let ogImage: string | null = null;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; DindrBot/1.0; +https://dindr.lovable.app)",
        },
      });
      if (res.ok) {
        html = await res.text();
        ogImage = extractOgImage(html);
      }
    } catch (e) {
      console.warn("[import-recipe] fetch failed", e);
    }

    const pageText = stripHtml(html).slice(0, 12000);

    // 2. Ask the AI to structure it
    const prompt = `Extract a single recipe from the page content below.
URL: ${url}
Return strictly valid JSON matching this schema (no markdown, no commentary):
{
  "title": string,
  "description": string (1-2 sentences),
  "image_url": string|null,
  "category": "breakfast"|"lunch"|"dinner"|"snack"|"dessert",
  "cuisine": string,
  "difficulty": "easy"|"medium"|"hard",
  "cooking_time_minutes": number,
  "servings": number,
  "ingredients": string[]  (each item with quantity, e.g. "200g flour"),
  "instructions": string[] (one step per array item, clear and concise)
}
If the page is not a recipe, return {"error":"not_a_recipe"}.

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
              "You extract structured recipe data from messy web page text. Reply with raw JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("[import-recipe] AI error", aiRes.status, text);
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
    // Strip markdown fences if present
    content = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

    let parsed: ExtractedRecipe | { error: string };
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("[import-recipe] JSON parse failed:", content.slice(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    if ("error" in parsed) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prefer og:image if AI didn't find one
    if (!parsed.image_url && ogImage) parsed.image_url = ogImage;

    return new Response(JSON.stringify({ recipe: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[import-recipe] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
