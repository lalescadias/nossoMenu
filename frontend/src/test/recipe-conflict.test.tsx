import { it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecipeEditor } from "../pages/Recipes";
import { api } from "../api";
import type { Recipe } from "../types";
vi.mock("../main", () => ({
  useApp: () => ({ openRecipe: vi.fn(), addToMenu: vi.fn() }),
}));
vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  api: vi.fn(),
}));
it("mantém a versão que foi aberta ao editar, mesmo após uma atualização remota", async () => {
  const recipe = {
    id: "recipe-1",
    version: 1,
    familyId: "family-1",
    name: "Receita da família",
    description: "Uma receita",
    category: "Massas",
    cuisine: "Portuguesa",
    prepMinutes: 5,
    cookMinutes: 10,
    servings: 4,
    sideDish: false,
    instructions: "Cozer a massa e envolver no molho.",
    ingredients: [
      {
        id: "ingredient-1",
        name: "Massa",
        quantity: 300,
        unit: "g",
        category: "Mercearia",
      },
    ],
  } as Recipe;
  vi.mocked(api).mockResolvedValue(undefined);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const close = vi.fn();
  const wrapper = (r: Recipe) => (
    <QueryClientProvider client={client}>
      <RecipeEditor recipe={r} onClose={close} />
    </QueryClientProvider>
  );
  const view = render(wrapper(recipe)),
    user = userEvent.setup();
  await user.clear(screen.getByRole("textbox", { name: "Nome da receita" }));
  await user.type(
    screen.getByRole("textbox", { name: "Nome da receita" }),
    "A minha edição",
  );
  view.rerender(
    wrapper({ ...recipe, version: 2, name: "Edição da outra pessoa" }),
  );
  await user.click(screen.getByRole("button", { name: "Guardar receita" }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/recipes/recipe-1",
      "PUT",
      expect.objectContaining({ version: 1, name: "A minha edição" }),
    ),
  );
});
