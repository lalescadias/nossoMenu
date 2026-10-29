import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShoppingPage } from "../pages/Shopping";
import { api } from "../api";
vi.mock("../api", async (importOriginal) => {
  const request = vi.fn();
  return {
    ...(await importOriginal<typeof import("../api")>()),
    api: request,
    apiAll: request,
  };
});
const item = {
  id: "item-1",
  name: "Leite",
  quantity: 2,
  unit: "l",
  category: "Laticínios",
  sourceType: "MANUAL",
  version: 4,
  purchased: false,
  purchasedAt: null,
  position: 0,
  sources: [],
};
const list = {
  id: "list-1",
  name: "Compras de casa",
  version: 1,
  status: "ACTIVE",
  menuId: "menu-1",
  startDate: "2026-11-02",
  items: [item],
};
function mount() {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={query}>
      <ShoppingPage />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(async (path, method) => {
    if (path === "/shopping-lists" && (!method || method === "GET"))
      return structuredClone([list]) as never;
    if (path.endsWith("/preview-sync"))
      return {
        token: "review-token",
        changes: { added: [], changed: [], removed: [], retained: [item] },
      } as never;
    return undefined as never;
  });
});
describe("Compras partilhadas", () => {
  it("só remove um produto depois de confirmar no modal", async () => {
    mount();
    const user = userEvent.setup();
    await screen.findByText("Leite");
    await user.click(screen.getByRole("button", { name: "Remover Leite" }));
    await screen.findByRole("dialog", { name: "Confirmar ação" });
    expect(
      vi.mocked(api).mock.calls.some(([, method]) => method === "DELETE"),
    ).toBe(false);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Confirmar ação" })).toBeNull();
    expect(
      vi.mocked(api).mock.calls.some(([, method]) => method === "DELETE"),
    ).toBe(false);
    await user.click(screen.getByRole("button", { name: "Remover Leite" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/shopping-lists/list-1/items/item-1?version=4",
        "DELETE",
      ),
    );
  });
  it("guarda a marcação com a versão do produto e mostra erros sem perder a lista", async () => {
    mount();
    const user = userEvent.setup();
    await screen.findByText("Leite");
    await user.click(
      screen.getByRole("button", { name: "Marcar como comprado Leite" }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/shopping-lists/list-1/items/item-1",
        "PATCH",
        expect.objectContaining({ purchased: true, version: 4, quantity: 2 }),
      ),
    );
    expect(screen.getByText("Leite")).toBeDefined();
  });
  it("só aplica uma atualização do menu depois da pré-visualização e confirmação", async () => {
    mount();
    const user = userEvent.setup();
    await screen.findByText("Leite");
    await user.click(screen.getByRole("button", { name: "Atualizar do menu" }));
    await screen.findByRole("heading", { name: "O que muda na lista?" });
    expect(
      vi.mocked(api).mock.calls.some(([path]) => path.endsWith("/apply-sync")),
    ).toBe(false);
    await user.click(
      screen.getByRole("button", { name: "Confirmar atualização" }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/shopping-lists/list-1/apply-sync",
        "POST",
        { token: "review-token" },
      ),
    );
  });
  it("adiciona produtos manuais de limpeza à lista existente", async () => {
    mount();
    const user = userEvent.setup();
    await screen.findByText("Leite");
    await user.click(screen.getByRole("button", { name: "Adicionar produto" }));
    await user.type(
      screen.getByRole("textbox", { name: "Produto" }),
      "Detergente",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Categoria" }),
      "Limpeza",
    );
    await user.click(screen.getByRole("button", { name: "Guardar produto" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/shopping-lists/list-1/items",
        "POST",
        expect.objectContaining({
          name: "Detergente",
          category: "Limpeza",
          quantity: 1,
          purchased: false,
        }),
      ),
    );
  });
});
