import { Loader2 } from "lucide-react";
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

const deriveStepTitle = (step: string, i: number): { title: string; body: string } => {
  // Try to use the first short sentence as a title; otherwise fall back to "Stap N".
  const firstSentence = step.split(/[.!?]/)[0]?.trim() ?? "";
  if (firstSentence && firstSentence.length <= 28) {
    return { title: firstSentence, body: step.slice(firstSentence.length + 1).trim() };
  }
  return { title: `Stap ${i + 1}`, body: step };
};

export const CardBack = ({
  recipe,
  stepImages,
  nutrition,
  generating,
  creatorName,
}: {
  recipe: Recipe;
  stepImages: string[];
  nutrition: Nutrition;
  generating: boolean;
  creatorName: string;
}) => {
  const ingredients = normalizeIngredients(recipe.ingredients);
  const steps = (recipe.instructions as string[]) ?? [];

  return (
    <div
      className="absolute inset-0 rounded-2xl overflow-hidden bg-white shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-1 grid grid-cols-[230px_1fr] min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="bg-neutral-100 m-3 rounded-lg p-4 overflow-y-auto">
          <Section title="Wat je van ons krijgt">
            <ul className="space-y-1 text-[11.5px] text-neutral-800">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-neutral-500">•</span>
                  <span className="leading-snug">
                    {ing.quantity && (
                      <span className="text-neutral-700">{ing.quantity} </span>
                    )}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Wat je thuis nodig hebt">
            <ul className="space-y-1 text-[11.5px] text-neutral-700">
              <li className="flex gap-1.5"><span className="text-neutral-500">•</span> peper en zout</li>
              <li className="flex gap-1.5"><span className="text-neutral-500">•</span> olijfolie</li>
            </ul>
          </Section>

          {nutrition && (
            <Section title="Voedingswaarde per portie">
              <p className="text-[11px] leading-relaxed text-neutral-700">
                {nutrition.calories != null && <>calorieën {Math.round(nutrition.calories)}kcal, </>}
                {nutrition.fat_g != null && <>vet {Math.round(nutrition.fat_g)}g, </>}
                {nutrition.carbs_g != null && <>koolhydraten {Math.round(nutrition.carbs_g)}g, </>}
                {nutrition.protein_g != null && <>eiwit {Math.round(nutrition.protein_g)}g</>}
              </p>
            </Section>
          )}
        </aside>

        {/* Steps grid */}
        <section className="overflow-y-auto p-4 pl-1">
          {generating && (
            <div className="mb-2 flex items-center gap-1.5 text-[10px] text-neutral-500 font-semibold">
              <Loader2 className="h-3 w-3 animate-spin" /> foto's worden gemaakt…
            </div>
          )}
          <div className="grid grid-cols-3 gap-x-4 gap-y-4">
            {steps.map((step, i) => {
              const img = stepImages[i];
              const { title, body } = deriveStepTitle(step, i);
              return (
                <div key={i} className="flex flex-col">
                  <div className="aspect-[4/3] rounded bg-neutral-100 overflow-hidden grid place-items-center">
                    {img ? (
                      <img src={img} alt={title} className="w-full h-full object-cover" />
                    ) : generating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                    ) : (
                      <span className="text-neutral-300 font-display font-extrabold text-3xl">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-2 text-[12px] font-bold leading-snug"
                    style={{ color: "#1a2540" }}
                  >
                    {i + 1}. {title}
                  </p>
                  {body && (
                    <p className="mt-1 text-[11px] leading-snug text-neutral-700">
                      {body}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 pb-2 pt-1 text-center">
        <p className="text-[10px] text-neutral-500">
          Receptkaart van <span className="font-semibold" style={{ color: "#1a2540" }}>{creatorName}</span> · gemaakt met Dindr
        </p>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-4 last:mb-0">
    <p
      className="text-[12px] font-bold mb-1.5"
      style={{ color: "#1a2540" }}
    >
      {title}
    </p>
    {children}
  </div>
);
