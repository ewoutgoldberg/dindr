// Lightweight per-day "ingredients I already have" store, kept in localStorage
// so we don't need a DB migration. Keyed by user + plan date.

const KEY_PREFIX = "pantry:";

const keyFor = (userId: string, dateKey: string) => `${KEY_PREFIX}${userId}:${dateKey}`;

export const normalizeIngredient = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, " ");

export const getPantry = (userId: string, dateKey: string): string[] => {
  try {
    const raw = localStorage.getItem(keyFor(userId, dateKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const setPantry = (userId: string, dateKey: string, items: string[]) => {
  const cleaned = Array.from(
    new Set(items.map(normalizeIngredient).filter((s) => s.length > 0 && s.length <= 40))
  ).slice(0, 30);
  localStorage.setItem(keyFor(userId, dateKey), JSON.stringify(cleaned));
  return cleaned;
};

export type RecipeIngredient = { name?: string; quantity?: string } | string;

export const extractIngredientNames = (ingredients: unknown): string[] => {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .map((i) => {
      if (typeof i === "string") return i;
      if (i && typeof i === "object" && "name" in i && typeof (i as { name: unknown }).name === "string") {
        return (i as { name: string }).name;
      }
      return "";
    })
    .filter(Boolean)
    .map(normalizeIngredient);
};

// Returns how many pantry items are referenced in the recipe's ingredient list.
// Uses substring matching in either direction so "tomato" matches "cherry tomato"
// and "parmesan cheese" in pantry matches a recipe ingredient called "parmesan".
export const countMatches = (pantry: string[], recipeIngredientNames: string[]): number => {
  if (pantry.length === 0 || recipeIngredientNames.length === 0) return 0;
  let n = 0;
  for (const p of pantry) {
    const hit = recipeIngredientNames.some((r) => r.includes(p) || p.includes(r));
    if (hit) n++;
  }
  return n;
};
