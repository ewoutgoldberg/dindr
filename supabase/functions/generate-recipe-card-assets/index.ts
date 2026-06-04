import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  recipe_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { recipe_id } = (await req.json()) as ReqBody;
    if (!recipe_id) {
      return json({ error: "recipe_id required" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: recipe, error: rErr } = await admin
      .from("recipes")
      .select("id,title,description,ingredients,instructions,step_images,nutrition,card_assets_generated_at")
      .eq("id", recipe_id)
      .maybeSingle();
    if (rErr || !recipe) return json({ error: "Recipe not found" }, 404);

    // If already generated, return cached
    if (recipe.card_assets_generated_at) {
      return json({ step_images: recipe.step_images, nutrition: recipe.nutrition, cached: true });
    }

    const steps = (recipe.instructions as string[]) ?? [];
    const ingredients = recipe.ingredients as unknown[];

    // 1. Generate nutrition via text model
    let nutrition: Record<string, number> | null = null;
    try {
      const nutRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Schat de voedingswaarde per portie van een recept. Geef alleen JSON terug." },
            {
              role: "user",
              content: `Recept: ${recipe.title}\nIngrediënten: ${JSON.stringify(ingredients)}\nGeef JSON: {\"calories\":number,\"protein_g\":number,\"fat_g\":number,\"carbs_g\":number}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (nutRes.ok) {
        const j = await nutRes.json();
        const txt = j.choices?.[0]?.message?.content ?? "{}";
        nutrition = JSON.parse(txt);
      }
    } catch (e) {
      console.error("nutrition failed", e);
    }

    // 2. Generate one image per step (sequential to be gentle on rate limit)
    const stepImages: string[] = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        const prompt = `Overhead food photography style step-by-step cooking image showing: ${step}. Clean kitchen, natural light, recipe card illustration style, no text, no watermark.`;
        const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!imgRes.ok) {
          const t = await imgRes.text();
          console.error(`step ${i} image failed`, imgRes.status, t);
          stepImages.push("");
          continue;
        }
        const j = await imgRes.json();
        const b64 = j.data?.[0]?.b64_json;
        if (!b64) {
          stepImages.push("");
          continue;
        }
        // upload to storage
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const path = `recipe-cards/${recipe.id}/step-${i}-${Date.now()}.png`;
        const { error: upErr } = await admin.storage
          .from("lovable-uploads")
          .upload(path, bytes, { contentType: "image/png", upsert: true });
        if (upErr) {
          console.error("upload failed", upErr);
          stepImages.push("");
          continue;
        }
        const { data: pub } = admin.storage.from("lovable-uploads").getPublicUrl(path);
        stepImages.push(pub.publicUrl);
      } catch (e) {
        console.error(`step ${i} error`, e);
        stepImages.push("");
      }
    }

    // 3. Save back to recipe
    const { error: updErr } = await admin
      .from("recipes")
      .update({
        step_images: stepImages,
        nutrition,
        card_assets_generated_at: new Date().toISOString(),
      })
      .eq("id", recipe.id);
    if (updErr) console.error("update failed", updErr);

    return json({ step_images: stepImages, nutrition, cached: false });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
