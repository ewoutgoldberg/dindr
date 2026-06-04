export type AllergenKey =
  | "gluten"
  | "dairy"
  | "eggs"
  | "peanuts"
  | "tree_nuts"
  | "soy"
  | "fish"
  | "shellfish"
  | "sesame";

export const ALLERGENS: { key: AllergenKey; label: string; keywords: string[] }[] = [
  { key: "gluten", label: "Gluten", keywords: ["wheat", "flour", "bread", "pasta", "barley", "rye", "couscous", "breadcrumb", "panko", "noodle", "spaghetti", "tortilla"] },
  { key: "dairy", label: "Dairy", keywords: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "parmesan", "mozzarella", "feta", "ricotta", "ghee", "mascarpone"] },
  { key: "eggs", label: "Eggs", keywords: ["egg"] },
  { key: "peanuts", label: "Peanuts", keywords: ["peanut"] },
  { key: "tree_nuts", label: "Tree nuts", keywords: ["almond", "walnut", "cashew", "pecan", "hazelnut", "pistachio", "macadamia"] },
  { key: "soy", label: "Soy", keywords: ["soy", "soya", "tofu", "edamame", "tempeh"] },
  { key: "fish", label: "Fish", keywords: ["salmon", "tuna", "cod", "anchovy", "sardine", "fish", "trout", "haddock"] },
  { key: "shellfish", label: "Shellfish", keywords: ["shrimp", "prawn", "crab", "lobster", "mussel", "clam", "oyster", "scallop", "squid", "calamari"] },
  { key: "sesame", label: "Sesame", keywords: ["sesame", "tahini"] },
];

export const recipeHasAllergen = (
  ingredientNames: string[],
  allergens: string[],
): boolean => {
  if (!allergens?.length) return false;
  const text = ingredientNames.join(" ").toLowerCase();
  for (const key of allergens) {
    const entry = ALLERGENS.find((a) => a.key === key);
    if (!entry) continue;
    if (entry.keywords.some((kw) => text.includes(kw))) return true;
  }
  return false;
};
