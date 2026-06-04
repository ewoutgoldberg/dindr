// Local "Healthy only" preference per user + date (no DB column needed).

const key = (userId: string, date: string) => `healthy:${userId}:${date}`;

export const getHealthyOnly = (userId: string, date: string): boolean => {
  try {
    return localStorage.getItem(key(userId, date)) === "1";
  } catch {
    return false;
  }
};

export const setHealthyOnly = (userId: string, date: string, value: boolean) => {
  try {
    if (value) localStorage.setItem(key(userId, date), "1");
    else localStorage.removeItem(key(userId, date));
  } catch {
    // ignore
  }
  return value;
};

const HEALTHY_CATEGORIES = new Set(["Salad", "Vegetarian"]);
const HEALTHY_KEYWORDS = /\b(healthy|light|low[\s-]?cal(?:orie)?|low[\s-]?fat|bowl|veggie|veg|protein|lean|fit|gezond|salad)\b/i;

type RecipeLike = {
  category?: string | null;
  title?: string | null;
  description?: string | null;
};

export const isHealthyRecipe = (r: RecipeLike): boolean => {
  if (r.category && HEALTHY_CATEGORIES.has(r.category)) return true;
  const text = `${r.title ?? ""} ${r.description ?? ""}`;
  return HEALTHY_KEYWORDS.test(text);
};
