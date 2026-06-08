import { Clock, Utensils } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes">;

export const CardFront = ({
  recipe,
  creatorName,
}: {
  recipe: Recipe;
  creatorName: string;
}) => {
  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden bg-white shadow-2xl [backface-visibility:hidden] flex flex-col">
      {/* Top brand strip */}
      <div className="shrink-0 py-3 px-6 grid place-items-center bg-white">
        <p
          className="text-[13px] font-semibold uppercase tracking-[0.35em]"
          style={{ color: "#1a2540" }}
        >
          {creatorName}
        </p>
      </div>

      {/* Hero image */}
      <div className="flex-1 mx-5 relative overflow-hidden bg-neutral-100">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-300" />
        )}
      </div>

      {/* Gold accent bar */}
      <div className="shrink-0 h-2 mx-5 mt-3" style={{ backgroundColor: "#C8A35C" }} />

      {/* Bottom info panel */}
      <div className="shrink-0 px-6 py-4 grid grid-cols-[1fr_1px_1.4fr] gap-5">
        <div className="min-w-0">
          <h1
            className="font-display font-extrabold text-[22px] leading-tight"
            style={{ color: "#1a2540" }}
          >
            {recipe.title}
          </h1>
          {recipe.subtitle && (
            <p className="italic text-[13px] text-neutral-600 mt-0.5">
              {recipe.subtitle}
            </p>
          )}
          <div className="flex items-center gap-5 mt-3 text-[12px] text-neutral-700">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
              ca. {recipe.cooking_time_minutes}min
            </span>
            <span className="flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5" strokeWidth={1.5} />
              {recipe.servings} personen
            </span>
          </div>
        </div>

        <div className="bg-neutral-300/70" />

        <p className="text-[12.5px] leading-relaxed text-neutral-700 line-clamp-5">
          {recipe.description ||
            "Een heerlijk gerecht om samen klaar te maken. Volg de stappen op de achterkant van de kaart voor het beste resultaat."}
        </p>
      </div>
    </div>
  );
};
