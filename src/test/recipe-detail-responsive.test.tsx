import { describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// --- Mocks ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

vi.mock("@/hooks/useFavorite", () => ({
  useFavorite: () => ({ isFavorite: false, toggle: () => {} }),
}));

const mockRecipe = {
  id: "r1",
  title: "Test Pasta",
  description: "Yummy",
  category: "Pasta",
  difficulty: "easy",
  cooking_time_minutes: 25,
  servings: 2,
  image_url: "https://example.com/img.jpg",
  ingredients: [{ name: "Pasta", quantity: "200 g" }],
  instructions: ["Boil water", "Add pasta"],
  food_creators: null,
};

vi.mock("@/integrations/supabase/client", () => {
  const builder = (result: { data: unknown; error: null }) => {
    const promise = Promise.resolve(result);
    const chain: Record<string, unknown> = {
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      finally: promise.finally.bind(promise),
      maybeSingle: () => Promise.resolve(result),
    };
    ["select", "eq", "order", "limit", "upsert", "insert"].forEach((m) => {
      chain[m] = () => chain;
    });
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === "recipes") return builder({ data: mockRecipe, error: null });
        return builder({ data: [], error: null });
      },
    },
  };
});

import RecipeDetail from "@/pages/RecipeDetail";

const renderAt = (width: number) => {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  window.dispatchEvent(new Event("resize"));
  return render(
    <MemoryRouter initialEntries={["/recipe/r1"]}>
      <Routes>
        <Route path="/recipe/:id" element={<RecipeDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("RecipeDetail responsive layout", () => {
  const assertLayout = async (width: number) => {
    const { container } = renderAt(width);
    await waitFor(
      () => {
        if (!container.querySelector("h1")) throw new Error("still loading");
      },
      { timeout: 4000 }
    );

    const hero = container.querySelector("img")?.parentElement as HTMLElement;
    expect(hero).toBeTruthy();
    expect(hero.className).toMatch(/max-w-md/);
    expect(hero.className).toMatch(/mx-auto/);
    expect(hero.className).toMatch(/max-h-\[520px\]/);

    // Stats card grid is the parent of the "Cook" label cell
    const cookLabel = screen.getByText("Cook");
    const statsCard = cookLabel.closest(".grid-cols-3") as HTMLElement;
    expect(statsCard).toBeTruthy();
    const statsColumn = statsCard.parentElement as HTMLElement;
    expect(statsColumn.className).toMatch(/max-w-md/);
    expect(statsColumn.className).toMatch(/mx-auto/);
    expect(statsColumn.className).toMatch(/-mt-6/);

    cleanup();
  };

  it("aligns hero and stats card at mobile width (375px)", async () => {
    await assertLayout(375);
  });

  it("aligns hero and stats card at desktop width (1280px)", async () => {
    await assertLayout(1280);
  });
});
