import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
    ["select", "eq", "order", "limit"].forEach((m) => {
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders content at mobile width (375px) with shared max-w container", async () => {
    const { container, unmount } = renderAt(375);
    try {
      await waitFor(() => expect(screen.getByText("Test Pasta")).toBeInTheDocument(), { timeout: 3000 });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("BODY:", document.body.innerHTML.slice(0, 3000));
      throw e;
    }

    const hero = container.querySelector("img")?.parentElement;
    const stats = screen.getByText("Cook").closest("div.bg-card");

    expect(hero?.className).toMatch(/max-w-md/);
    expect(hero?.className).toMatch(/mx-auto/);
    expect(stats?.parentElement?.className).toMatch(/max-w-md/);
    expect(stats?.parentElement?.className).toMatch(/mx-auto/);
    unmount();
  });

  it("renders content at desktop width (1280px) without hero overflowing the stats column", async () => {
    const { container, unmount } = renderAt(1280);
    await waitFor(() => expect(screen.getByText("Test Pasta")).toBeInTheDocument());

    const hero = container.querySelector("img")?.parentElement;
    const stats = screen.getByText("Cook").closest("div.bg-card");

    // Hero image container must be height-bounded so it cannot extend past the stats card on desktop
    expect(hero?.className).toMatch(/max-h-\[520px\]/);
    expect(hero?.className).toMatch(/max-w-md/);

    // Stats card must use the negative top margin to overlap the hero in the same column
    expect(stats?.parentElement?.className).toMatch(/-mt-6/);
    expect(stats?.parentElement?.className).toMatch(/max-w-md/);
    unmount();
  });
});
