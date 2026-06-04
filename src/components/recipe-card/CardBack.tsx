import { Clock, ChefHat, Users, Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes">;

type Nutrition = {
  calories?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
} | null;

const normalizeIngredients = (raw: unknown): Array<{ name: string; quantity: string }> => {
  if (!Array.isArray(raw)) return [];
  return raw.map((ing) => {
    if (typeof ing === "string") {
      const m = ing.match(/^([\d.,/]+\s*[a-zA-Z]*\.?)\s+(.+)$/);
      if (m) return { quantity: m[1].trim(), name: m[2].trim() };
      return { name: ing, quantity: "" };
    }
    if (ing && typeof ing === "object") {
      const o = ing as Record<string, unknown>;
      return {
        name: String(o.name ?? o.ingredient ?? ""),
        quantity: String(o.quantity ?? o.amount ?? ""),
      };
    }
    return { name: String(ing ?? ""), quantity: "" };
  });
};

export const CardBack = ({
  recipe,
  stepImages,
  nutrition,
  generating,
}: {
  recipe: Recipe;
  stepImages: string[];
  nutrition: Nutrition;
  generating: boolean;
}) => {
  const ingredients = normalizeIngredients(recipe.ingredients);
  const steps = (recipe.instructions as string[]) ?? [];

  return (
    <div
      className="absolute inset-0 rounded-2xl overflow-hidden bg-card shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-1">
              Dindr · Receptkaart
            </p>
            <h2 className="font-display font-extrabold text-xl leading-tight truncate">
              {recipe.title}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {recipe.cooking_time_minutes}m
            </span>
            <span className="flex items-center gap-1.5 capitalize">
              <ChefHat className="h-3.5 w-3.5 text-primary" />
              {recipe.difficulty}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              {recipe.servings}
            </span>
          </div>
        </div>

        {/* Nutrition strip */}
        {nutrition && (
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <NutItem label="kcal" value={nutrition.calories} />
            <NutItem label="eiwit" value={nutrition.protein_g} suffix="g" />
            <NutItem label="vet" value={nutrition.fat_g} suffix="g" />
            <NutItem label="koolh." value={nutrition.carbs_g} suffix="g" />
          </div>
        )}
      </div>

      {/* Body: ingredients + steps */}
      <div className="flex-1 grid grid-cols-[220px_1fr] min-h-0 overflow-hidden">
        {/* Ingredients */}
        <aside className="bg-muted/40 border-r border-border overflow-y-auto p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Ingrediënten
          </p>
          <ul className="space-y-2 text-sm">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-border/50 pb-1.5">
                <span className="font-medium leading-snug">{ing.name}</span>
                <span className="text-muted-foreground font-mono text-xs shrink-0">
                  {ing.quantity}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Steps */}
        <section className="overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Bereiding · {steps.length} stappen
            </p>
            {generating && (
              <span className="text-[10px] text-primary flex items-center gap-1 font-semibold">
                <Loader2 className="h-3 w-3 animate-spin" /> foto's worden gemaakt…
              </span>
            )}
          </div>
          <ol className="space-y-3">
            {steps.map((step, i) => {
              const img = stepImages[i];
              return (
                <li
                  key={i}
                  className="grid grid-cols-[80px_1fr] gap-3 items-start bg-background rounded-xl p-2 shadow-soft"
                >
                  <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted relative grid place-items-center">
                    {img ? (
                      <img src={img} alt={`Stap ${i + 1}`} className="w-full h-full object-cover" />
                    ) : generating ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-2xl font-display font-extrabold text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                    {img && (
                      <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed pt-1">{step}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
};

const NutItem = ({
  label,
  value,
  suffix,
}: {
  label: string;
  value?: number;
  suffix?: string;
}) => (
  <div className="bg-muted/60 rounded-lg py-1.5">
    <p className="text-sm font-display font-extrabold leading-none">
      {value != null ? Math.round(value) : "—"}
      {suffix && value != null ? <span className="text-[10px] font-semibold ml-0.5">{suffix}</span> : null}
    </p>
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
  </div>
);
