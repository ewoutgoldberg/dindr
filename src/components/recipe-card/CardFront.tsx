import { Clock, ChefHat, Users, RotateCw } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes">;

export const CardFront = ({ recipe }: { recipe: Recipe }) => {
  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden bg-card shadow-2xl [backface-visibility:hidden]">
      {recipe.image_url ? (
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 gradient-primary" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* top brand strip */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white">
        <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">
          Dindr · Receptkaart
        </div>
        <div className="flex items-center gap-1.5 text-xs opacity-80">
          <RotateCw className="h-3.5 w-3.5" /> tik om om te draaien
        </div>
      </div>

      {/* bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-8 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-foreground/80 mb-2">
          {recipe.category}
        </p>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-tight drop-shadow-lg max-w-2xl">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="mt-3 text-sm opacity-90 max-w-xl line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="mt-5 flex items-center gap-5 text-sm font-semibold">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {recipe.cooking_time_minutes} min
          </span>
          <span className="flex items-center gap-1.5 capitalize">
            <ChefHat className="h-4 w-4" /> {recipe.difficulty}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> {recipe.servings} pers.
          </span>
        </div>
      </div>
    </div>
  );
};
