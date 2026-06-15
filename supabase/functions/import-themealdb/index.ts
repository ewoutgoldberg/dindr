// Edge function: bulk-import recipes from TheMealDB (~600 meals A-Z),
// classify smart tags via Lovable AI in batches, and upsert into `recipes`.
// Admin-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type MealDbMeal = Record<string, string | null> & {
  idMeal: string;
  strMeal: string;
  strMealThumb: string | null;
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | null;
  strTags: string | null;
};

interface ParsedIngredient {
  name: string;
  quantity: string;
}

const parseIngredients = (m: MealDbMeal): ParsedIngredient[] => {
  const out: ParsedIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] ?? "").toString().trim();
    const qty = (m[`strMeasure${i}`] ?? "").toString().trim();
    if (name && name.toLowerCase() !== "null") {
      out.push({ name, quantity: qty });
    }
  }
  return out;
};

const splitInstructions = (text: string | null): string[] => {
  if (!text) return [];
  // Split on numbered steps, newlines, or sentence endings followed by capital
  const cleaned = text.replace(/\r/g, "").trim();
  const byLine = cleaned.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (byLine.length >= 3) return byLine;
  return cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const guessDifficulty = (ingredientCount: number, steps: number): string => {
  const score = ingredientCount + steps;
  if (score <= 10) return "easy";
  if (score <= 18) return "medium";
  return "advanced";
};

const guessTime = (steps: number, instructionsLength: number): number => {
  // Rough heuristic
  const base = 15 + steps * 5;
  const lengthFactor = Math.min(40, Math.floor(instructionsLength / 200) * 5);
  return Math.min(120, base + lengthFactor);
};

const guessMealType = (category: string | null): string | null => {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c === "dessert") return "dessert";
  if (c === "breakfast") return "breakfast";
  if (c === "starter" || c === "side") return "snack";
  return "dinner";
};

const heuristicTags = (m: MealDbMeal, ingredients: ParsedIngredient[], steps: string[]): string[] => {
  const tags = new Set<string>();
  const cat = (m.strCategory ?? "").toLowerCase();
  const title = (m.strMeal ?? "").toLowerCase();
  const allText = `${title} ${m.strInstructions ?? ""} ${ingredients.map((i) => i.name).join(" ")}`.toLowerCase();

  if (cat === "vegetarian" || cat === "vegan") tags.add("vegetarian");
  if (/\b(chili|jalapen|sriracha|curry|spicy|hot pepper|cayenne|harissa)\b/.test(allText)) tags.add("spicy");
  if (/\b(salad|grilled chicken|steamed|tofu|quinoa|lentil|spinach|kale|broccoli)\b/.test(allText)) tags.add("healthy");
  if (/\b(beef|chicken|pork|salmon|tuna|tofu|lentil|chickpea|egg|paneer)\b/.test(allText)) tags.add("high_protein");
  if (/\b(stew|casserole|mac and cheese|lasagne|pie|roast|mash|fried)\b/.test(allText)) tags.add("comfort");

  const time = guessTime(steps.length, (m.strInstructions ?? "").length);
  if (time <= 25 && ingredients.length <= 8) tags.add("quick");

  return [...tags];
};

const SMART_TAGS = ["quick", "healthy", "comfort", "spicy", "vegetarian", "high_protein"] as const;

async function aiClassifyBatch(batch: { id: string; title: string; ingredients: string[] }[]): Promise<Record<string, string[]>> {
  if (!LOVABLE_API_KEY || batch.length === 0) return {};
  const system = `You are a culinary classifier. For each recipe, output which smart tags apply.
Valid tags: ${SMART_TAGS.join(", ")}.
- quick: under ~25 min total prep+cook
- healthy: lean, lots of veg, low sat-fat
- comfort: hearty, rich, traditional comfort food
- spicy: noticeable heat from chilies/spices
- vegetarian: NO meat, fish, or seafood
- high_protein: prominent meat, fish, eggs, legumes, or tofu

Return strictly valid JSON: {"results":[{"id":"...","tags":["..."]}]}. Use [] if none apply. No markdown.`;
  const user = JSON.stringify({ recipes: batch });
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    console.warn("[import-themealdb] AI batch failed", res.status);
    return {};
  }
  const json = await res.json();
  let content: string = json.choices?.[0]?.message?.content ?? "";
  content = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(content) as { results: { id: string; tags: string[] }[] };
    const out: Record<string, string[]> = {};
    for (const r of parsed.results ?? []) {
      out[r.id] = (r.tags ?? []).filter((t) => (SMART_TAGS as readonly string[]).includes(t));
    }
    return out;
  } catch {
    console.warn("[import-themealdb] AI returned invalid JSON");
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is admin
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const useAI: boolean = body?.useAI !== false; // default true

    // 1. Fetch all meals A-Z
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    const allMeals: MealDbMeal[] = [];
    const seen = new Set<string>();
    for (const letter of letters) {
      try {
        const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
        if (!r.ok) continue;
        const j = await r.json();
        for (const m of (j.meals ?? []) as MealDbMeal[]) {
          if (!m?.idMeal || seen.has(m.idMeal)) continue;
          seen.add(m.idMeal);
          allMeals.push(m);
        }
      } catch (e) {
        console.warn("[import-themealdb] letter failed", letter, e);
      }
    }

    console.log(`[import-themealdb] fetched ${allMeals.length} unique meals`);

    // 2. Normalize
    const normalized = allMeals.map((m) => {
      const ingredients = parseIngredients(m);
      const steps = splitInstructions(m.strInstructions);
      const baseTags = heuristicTags(m, ingredients, steps);
      return {
        themealdb_id: m.idMeal,
        title: (m.strMeal ?? "").trim(),
        description: steps[0] ? steps[0].slice(0, 200) : null,
        image_url: m.strMealThumb,
        category: m.strCategory,
        cuisine: m.strArea,
        difficulty: guessDifficulty(ingredients.length, steps.length),
        cooking_time_minutes: guessTime(steps.length, (m.strInstructions ?? "").length),
        servings: 4,
        ingredients,
        instructions: steps,
        meal_type: guessMealType(m.strCategory),
        published: true,
        content_source: "imported",
        baseTags,
      };
    }).filter((r) => r.title && r.image_url && r.ingredients.length > 0);

    // 3. AI tag classification in batches
    const tagMap: Record<string, string[]> = {};
    if (useAI) {
      const batchSize = 25;
      for (let i = 0; i < normalized.length; i += batchSize) {
        const batch = normalized.slice(i, i + batchSize).map((r) => ({
          id: r.themealdb_id,
          title: r.title,
          ingredients: r.ingredients.map((ing) => ing.name),
        }));
        const result = await aiClassifyBatch(batch);
        Object.assign(tagMap, result);
      }
    }

    // 4. Upsert in chunks
    let inserted = 0;
    let updated = 0;
    const chunk = 100;
    for (let i = 0; i < normalized.length; i += chunk) {
      const slice = normalized.slice(i, i + chunk).map((r) => {
        const aiTags = tagMap[r.themealdb_id] ?? [];
        const tags = Array.from(new Set([...r.baseTags, ...aiTags]));
        const { baseTags: _bt, ...rest } = r;
        return { ...rest, tags };
      });
      const { error, count } = await adminClient
        .from("recipes")
        .upsert(slice, { onConflict: "themealdb_id", count: "exact", ignoreDuplicates: false });
      if (error) {
        console.error("[import-themealdb] upsert error", error);
        return new Response(JSON.stringify({ error: error.message, inserted }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      inserted += count ?? slice.length;
    }

    return new Response(JSON.stringify({ ok: true, fetched: allMeals.length, imported: normalized.length, upserted: inserted, ai: useAI }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[import-themealdb] error", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
