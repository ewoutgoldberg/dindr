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
    if (!recipe_id) return json({ error: "recipe_id required" }, 400);

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

    if (recipe.card_assets_generated_at) {
      return json({ step_images: recipe.step_images, nutrition: recipe.nutrition, cached: true });
    }

    const steps = (recipe.instructions as string[]) ?? [];
    const ingredients = recipe.ingredients as unknown[];

    // Initialise empty placeholder array immediately so the frontend sees the right length
    const initialImages: string[] = steps.map(() => "");
    await admin.from("recipes").update({ step_images: initialImages }).eq("id", recipe.id);

    // Kick off nutrition + all step images in parallel
    const nutritionPromise = (async (): Promise<Record<string, number> | null> => {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        if (!res.ok) return null;
        const j = await res.json();
        const txt = j.choices?.[0]?.message?.content ?? "{}";
        const nut = JSON.parse(txt);
        await admin.from("recipes").update({ nutrition: nut }).eq("id", recipe.id);
        return nut;
      } catch (e) {
        console.error("nutrition failed", e);
        return null;
      }
    })();

    // Shared running array we mutate as steps finish; each write replaces step_images entirely
    const stepImages: string[] = [...initialImages];

    const stepPromises = steps.map((step, i) =>
      (async () => {
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
            console.error(`step ${i} image failed`, imgRes.status, await imgRes.text());
            return;
          }
          const j = await imgRes.json();
          const b64 = j.data?.[0]?.b64_json;
          if (!b64) return;
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const path = `recipe-cards/${recipe.id}/step-${i}-${Date.now()}.png`;
          const { error: upErr } = await admin.storage
            .from("lovable-uploads")
            .upload(path, bytes, { contentType: "image/png", upsert: true });
          if (upErr) {
            console.error("upload failed", upErr);
            return;
          }
          const { data: pub } = admin.storage.from("lovable-uploads").getPublicUrl(path);
          stepImages[i] = pub.publicUrl;
          // Push progressive update so the client sees it via realtime
          await admin.from("recipes").update({ step_images: [...stepImages] }).eq("id", recipe.id);
        } catch (e) {
          console.error(`step ${i} error`, e);
        }
      })()
    );

    const [nutrition] = await Promise.all([nutritionPromise, Promise.all(stepPromises)]);

    await admin
      .from("recipes")
      .update({
        step_images: stepImages,
        nutrition,
        card_assets_generated_at: new Date().toISOString(),
      })
      .eq("id", recipe.id);

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
