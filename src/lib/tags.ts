// Local "Smart tag" filter preference per user + date (no DB column needed).

export const SMART_TAGS = [
  { key: "quick", labelKey: "filters.tagQuick" },
  { key: "healthy", labelKey: "filters.tagHealthy" },
  { key: "comfort", labelKey: "filters.tagComfort" },
  { key: "spicy", labelKey: "filters.tagSpicy" },
  { key: "vegetarian", labelKey: "filters.tagVegetarian" },
  { key: "high_protein", labelKey: "filters.tagHighProtein" },
] as const;

export type SmartTag = (typeof SMART_TAGS)[number]["key"];

const key = (userId: string, date: string) => `tags:${userId}:${date}`;

export const getTags = (userId: string, date: string): string[] => {
  try {
    const raw = localStorage.getItem(key(userId, date));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const setTags = (userId: string, date: string, tags: string[]) => {
  try {
    if (tags.length === 0) localStorage.removeItem(key(userId, date));
    else localStorage.setItem(key(userId, date), JSON.stringify(tags));
  } catch {
    // ignore
  }
  return tags;
};
