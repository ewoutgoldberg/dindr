import { describe, it, expect, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
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
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        promise.then(onFulfilled, onRejected),
      catch: (onRejected: (e: unknown) => unknown) => promise.catch(onRejected),
      finally: (onFinally: () => void) => promise.finally(onFinally),
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

const flush = async () => {
  // Allow all queued microtasks/promises to resolve and React to re-render
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
};

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
    await flush();

    const img = container.querySelector("img");
    expect(img, "expected hero image to be rendered after data load").toBeTruthy();
    const hero = img!.parentElement as HTMLElement;

    // Hero image container shares the same column constraints as the rest of the content
    expect(hero.className).toMatch(/max-w-md/);
    expect(hero.className).toMatch(/mx-auto/);
    expect(hero.className).toMatch(/max-h-\[520px\]/);

    // Stats card must sit in a max-w-md column with negative top margin to overlap the hero
    const statsCard = container.querySelector(".grid-cols-3") as HTMLElement | null;
    expect(statsCard, "expected stats card to render").toBeTruthy();
    const statsColumn = statsCard!.parentElement as HTMLElement;
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
