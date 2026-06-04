export const MEAL_TYPES = [
  { key: "breakfast", label: "Ontbijt" },
  { key: "lunch", label: "Lunch" },
  { key: "snack", label: "Snacks" },
  { key: "dinner", label: "Diner" },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]["key"];
