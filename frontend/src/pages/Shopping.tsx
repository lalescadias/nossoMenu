import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  ShoppingBasket,
  Heart,
  History,
  RefreshCw,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUp,
  Copy,
  Search,
  Sparkles,
  ArrowRight,
  CheckCheck,
} from "lucide-react";
import { api, apiAll } from "../api";
import { useAction } from "../useAction";
import { useConfirmation } from "../useConfirmation";
import { Modal, ErrorMessage, Empty, Loading, categories, units } from "../ui";
import { iso, weekLabel, format } from "../date";
import type {
  ShoppingList,
  Item,
  FavoriteProduct,
  FrequentProduct,
  SyncPreview,
  Menu,
} from "../types";

export function ShoppingPage() {
  const { confirm, confirmationModal } = useConfirmation();
  const [activeId, setActiveId] = useState<string | null>(null),
    [tab, setTab] = useState("active"),
    [filter, setFilter] = useState("all"),
    [newList, setNewList] = useState(false),
    [fromMenu, setFromMenu] = useState(false),
    [editing, setEditing] = useState<Item | "new" | null>(null),
    [preview, setPreview] = useState<SyncPreview | null>(null);
  const action = useAction();
  const lists = useQuery({
    queryKey: ["lists"],
    queryFn: () => apiAll<ShoppingList>("/shopping-lists"),
  });
  const list =
    lists.data?.find((l) => l.id === activeId) ||
    lists.data?.find((l) => l.status === "ACTIVE") ||
    lists.data?.[0];
  const purchased = list?.items.filter((i) => i.purchased).length ?? 0,
    pending = (list?.items.length ?? 0) - purchased;
  const visible =
    list?.items.filter(
      (i) =>
        filter === "all" || (filter === "bought" ? i.purchased : !i.purchased),
    ) || [];
  const groups = Array.from(new Set(visible.map((i) => i.category))).sort(
    (a, b) => categories.indexOf(a) - categories.indexOf(b),
  );
  async function toggle(item: Item) {
    if (!list) return;
    await action.run(() =>
      api(`/shopping-lists/${list.id}/items/${item.id}`, "PATCH", {
        ...item,
        purchased: !item.purchased,
      }),
    );
  }
  async function favorite(item: Item) {
    await action.run(() => api("/favorite-products", "POST", item));
  }
  async function remove(item: Item) {
    if (list && (await confirm(`Remover ${item.name} da lista?`)))
      await action.run(() =>
        api(
          `/shopping-lists/${list.id}/items/${item.id}?version=${item.version}`,
          "DELETE",
        ),
      );
  }
  return (
    <>
      {confirmationModal}
      <div className="page-heading">
        <div>
          <span className="eyebrow">PARA NÃO FALTAR NADA À MESA</span>
          <h1>
            As nossas compras<span className="heading-dot">.</span>
          </h1>
          <p>Uma lista partilhada. Uma ida ao supermercado mais simples.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            onClick={() => setFromMenu(true)}
          >
            <Sparkles size={16} />
            Gerar do menu
          </button>
          <button className="button primary" onClick={() => setNewList(true)}>
            <Plus size={17} />
            Nova lista
          </button>
        </div>
      </div>
      <div className="tabs shopping-tabs">
        <button
          className={tab === "active" ? "active" : ""}
          onClick={() => setTab("active")}
        >
          <ShoppingBasket size={17} />
          As listas
        </button>
        <button
          className={tab === "favorites" ? "active" : ""}
          onClick={() => setTab("favorites")}
        >
          <Heart size={17} />
          Compras favoritas
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          <History size={17} />
          Histórico
        </button>
      </div>
      <ErrorMessage error={action.error || lists.error} />
      {tab === "favorites" ? (
        <Favorites list={list} />
      ) : tab === "history" ? (
        <>
          <h2>Listas que fazem parte da nossa história</h2>
          <div className="history-grid">
            {lists.data?.map((l) => (
              <article className="history-card" key={l.id}>
                <div className="section-title">
                  <ShoppingBasket size={20} />
                  <span className="pill">
                    {l.status === "ACTIVE"
                      ? "Em curso"
                      : l.status === "COMPLETED"
                        ? "Concluída"
                        : "Arquivada"}
                  </span>
                </div>
                <h3>{l.name}</h3>
                <p>
                  {l.items.length} produtos ·{" "}
                  {l.items.filter((i) => i.purchased).length} comprados
                </p>
                <small>
                  Criada em {new Date(l.createdAt).toLocaleDateString("pt-PT")}
                </small>
                <div className="modal-actions">
                  <button
                    className="text-button"
                    onClick={() => {
                      setActiveId(l.id);
                      setTab("active");
                    }}
                  >
                    Consultar
                    <ArrowRight size={15} />
                  </button>
                  <button
                    className="button secondary compact"
                    disabled={action.pending}
                    onClick={() =>
                      action.run(
                        () =>
                          api<ShoppingList>(
                            `/shopping-lists/${l.id}/duplicate`,
                            "POST",
                          ),
                        (copy) => {
                          setActiveId(copy.id);
                          setTab("active");
                        },
                      )
                    }
                  >
                    <Copy size={14} />
                    Reutilizar
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!lists.data?.length && (
            <Empty title="O histórico começa com a primeira lista" />
          )}
        </>
      ) : lists.isPending ? (
        <Loading />
      ) : !list ? (
        <Empty title="Vamos preparar a próxima ida às compras?">
          <p>Cria uma lista livre ou gera os ingredientes do menu semanal.</p>
          <button className="button primary" onClick={() => setNewList(true)}>
            <Plus size={16} />
            Criar uma lista
          </button>
        </Empty>
      ) : (
        <>
          <div className="shopping-summary">
            <div>
              <span className="eyebrow">A LISTA DA FAMÍLIA</span>
              <select
                className="list-select"
                aria-label="Lista de compras"
                value={list.id}
                onChange={(e) => setActiveId(e.target.value)}
              >
                {lists.data?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.status === "ACTIVE"
                      ? ""
                      : " · " +
                        (l.status === "COMPLETED" ? "Concluída" : "Arquivada")}
                  </option>
                ))}
              </select>
              <p>
                {list.startDate
                  ? weekLabel(list.startDate)
                  : "Uma lista para o que der e vier."}
              </p>
            </div>
            <div className="shopping-counts">
              <div>
                <strong>{pending}</strong>
                <span>por comprar</span>
              </div>
              <div>
                <strong>{purchased}</strong>
                <span>no carrinho</span>
              </div>
              <div
                className="progress-circle"
                style={
                  {
                    "--progress": `${list.items.length ? (purchased / list.items.length) * 100 : 0}%`,
                  } as React.CSSProperties
                }
              >
                <CheckCheck size={23} />
              </div>
            </div>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${list.items.length ? (purchased / list.items.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="section-toolbar shopping-toolbar">
            <div className="filter-pills">
              {[
                ["all", "Todos"],
                ["pending", "Por comprar"],
                ["bought", "Comprados"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="heading-actions">
              {list.menuId && (
                <button
                  className="button secondary compact"
                  disabled={action.pending}
                  onClick={() =>
                    action.run(
                      () =>
                        api<SyncPreview>(
                          `/shopping-lists/${list.id}/preview-sync`,
                          "POST",
                        ),
                      setPreview,
                    )
                  }
                >
                  <RefreshCw size={15} />
                  Atualizar do menu
                </button>
              )}
              <button
                className="button primary compact"
                onClick={() => setEditing("new")}
              >
                <Plus size={16} />
                Adicionar produto
              </button>
            </div>
          </div>
          <div className="shopping-content">
            <section className="shopping-items">
              {groups.map((category) => (
                <div className="shopping-category" key={category}>
                  <h3>
                    {category}
                    <span>
                      {visible.filter((i) => i.category === category).length}
                    </span>
                  </h3>
                  {visible
                    .filter((i) => i.category === category)
                    .map((item, index) => (
                      <div
                        className={`shopping-item ${item.purchased ? "purchased" : ""}`}
                        key={item.id}
                      >
                        <button
                          className="check-button"
                          disabled={action.pending}
                          aria-label={`${item.purchased ? "Desmarcar" : "Marcar como comprado"} ${item.name}`}
                          aria-pressed={item.purchased}
                          onClick={() => toggle(item)}
                        >
                          {item.purchased && <Check size={17} />}
                        </button>
                        <div className="item-info">
                          <strong>{item.name}</strong>
                          <small>
                            {item.purchased
                              ? `Comprado em ${new Date(item.purchasedAt!).toLocaleDateString("pt-PT")}`
                              : item.sourceType === "MENU"
                                ? "Do menu semanal"
                                : "Adicionado pela família"}
                          </small>
                        </div>
                        <span className="item-quantity">
                          {item.quantity} <small>{item.unit}</small>
                        </span>
                        <div className="item-actions">
                          <button
                            className="icon-button"
                            aria-label={`Favoritar ${item.name}`}
                            disabled={action.pending}
                            onClick={() => favorite(item)}
                          >
                            <Heart size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Editar ${item.name}`}
                            onClick={() => setEditing(item)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Mover ${item.name} para cima`}
                            disabled={action.pending || index === 0}
                            onClick={() => {
                              const group = visible.filter(
                                  (i) => i.category === category,
                                ),
                                previous = group[index - 1];
                              void action.run(async () => {
                                await api(
                                  `/shopping-lists/${list.id}/items/${item.id}`,
                                  "PATCH",
                                  { ...item, position: previous.position - 1 },
                                );
                              });
                            }}
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            className="icon-button delete"
                            aria-label={`Remover ${item.name}`}
                            disabled={action.pending}
                            onClick={() => remove(item)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
              {!visible.length && (
                <Empty
                  title={
                    filter === "pending"
                      ? "Tudo no carrinho!"
                      : "A lista ainda está à tua espera"
                  }
                >
                  <p>
                    {filter === "pending"
                      ? "Boas compras e bom regresso a casa."
                      : "Adiciona os primeiros produtos."}
                  </p>
                </Empty>
              )}
            </section>
            <aside className="shopping-aside">
              <div className="info-card">
                <Heart size={23} />
                <h3>
                  Os habituais,
                  <br />
                  sempre à mão.
                </h3>
                <p>
                  Guarda os produtos de sempre e adiciona-os à lista em
                  segundos.
                </p>
                <button
                  className="text-button"
                  onClick={() => setTab("favorites")}
                >
                  Ver compras favoritas
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="gentle-note">
                <strong>O menu mudou?</strong>
                <p>
                  A lista só muda quando pedires. Podes rever as alterações
                  antes de confirmar.
                </p>
              </div>
              <button
                className="button secondary full"
                disabled={action.pending}
                onClick={async () => {
                  if (
                    await confirm(
                      list.status === "ACTIVE"
                        ? "Concluir esta lista? Continuará disponível no histórico."
                        : "Reabrir esta lista?",
                    )
                  )
                    void action.run(() =>
                      api(`/shopping-lists/${list.id}`, "PATCH", {
                        status:
                          list.status === "ACTIVE" ? "COMPLETED" : "ACTIVE",
                        version: list.version,
                      }),
                    );
                }}
              >
                <CheckCheck size={17} />
                {list.status === "ACTIVE" ? "Concluir lista" : "Reabrir lista"}
              </button>
            </aside>
          </div>
        </>
      )}
      {(newList || fromMenu) && (
        <NewList
          fromMenu={fromMenu}
          onClose={() => {
            setNewList(false);
            setFromMenu(false);
          }}
          onCreated={(id) => {
            setActiveId(id);
            setTab("active");
          }}
        />
      )}
      {editing && list && (
        <ItemEditor
          list={list}
          item={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {preview && list && (
        <Modal title="O que muda na lista?" onClose={() => setPreview(null)}>
          <p>
            Revê as diferenças antes de atualizar <strong>{list.name}</strong>.
          </p>
          {(
            [
              ["added", "Produtos adicionados"],
              ["changed", "Quantidades atualizadas"],
              ["removed", "Produtos que deixam de ser necessários"],
            ] as const
          ).map(([key, label]) => (
            <section className="sync-group" key={key}>
              <h3>
                {label}{" "}
                <span className="muted">({preview.changes[key].length})</span>
              </h3>
              {preview.changes[key].length ? (
                preview.changes[key].map((item) => (
                  <div className="sync-item" key={item.id}>
                    {item.name}
                    <strong>
                      {item.quantity} {item.unit}
                    </strong>
                  </div>
                ))
              ) : (
                <small>Sem alterações.</small>
              )}
            </section>
          ))}
          <div className="gentle-note">
            Os produtos manuais e os comprados que já não são necessários ficam
            guardados. O estado de compra é preservado.
          </div>
          <ErrorMessage error={action.error} />
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={action.pending}
              onClick={() =>
                action.run(
                  () =>
                    api(`/shopping-lists/${list.id}/apply-sync`, "POST", {
                      token: preview.token,
                    }),
                  () => setPreview(null),
                )
              }
            >
              Confirmar atualização
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function NewList({
  fromMenu,
  onClose,
  onCreated,
}: {
  fromMenu: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const action = useAction();
  const menus = useQuery({
    queryKey: ["menus"],
    queryFn: () => apiAll<Menu>("/menus"),
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await action.run(
      () =>
        api<ShoppingList>("/shopping-lists", "POST", {
          ...data,
          menuId: fromMenu ? data.menuId : null,
          startDate: data.startDate || null,
        }),
      (l) => {
        onCreated(l.id);
        onClose();
      },
    );
  }
  return (
    <Modal
      title={fromMenu ? "Do menu para a lista" : "Uma nova lista de compras"}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          Nome da lista
          <input
            name="name"
            defaultValue={fromMenu ? "Compras da semana" : "As nossas compras"}
            maxLength={150}
            required
          />
        </label>
        {fromMenu ? (
          <label>
            Menu da semana
            <select name="menuId" required>
              {menus.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {weekLabel(m.weekStart)}
                </option>
              ))}
            </select>
            {!menus.data?.length && (
              <small>Gera primeiro um menu na página Semana.</small>
            )}
          </label>
        ) : (
          <label>
            Início da semana (opcional)
            <input
              name="startDate"
              type="date"
              defaultValue={iso(new Date())}
            />
          </label>
        )}
        <div className="gentle-note">
          {fromMenu
            ? "Os ingredientes são calculados para as porções de cada almoço e jantar. Poderás ajustar tudo depois."
            : "Esta lista é independente do menu. Podes incluir alimentos, higiene, limpeza e o que a família precisar."}
        </div>
        <ErrorMessage error={action.error || menus.error} />
        <button
          className="button primary"
          disabled={action.pending || (fromMenu && !menus.data?.length)}
        >
          Criar lista
          <ArrowRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
function ItemEditor({
  list,
  item,
  onClose,
}: {
  list: ShoppingList;
  item?: Item;
  onClose: () => void;
}) {
  const action = useAction();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await action.run(
      () =>
        api(
          `/shopping-lists/${list.id}/items${item ? "/" + item.id : ""}`,
          item ? "PATCH" : "POST",
          {
            ...Object.fromEntries(data),
            quantity: Number(data.get("quantity")),
            version: item?.version ?? 0,
            purchased: item?.purchased ?? false,
          },
        ),
      onClose,
    );
  }
  return (
    <Modal
      title={item ? "Editar produto" : "O que precisamos de comprar?"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">
        <label>
          Produto
          <input
            name="name"
            defaultValue={item?.name}
            autoFocus
            required
            maxLength={150}
            placeholder="Por exemplo, leite ou detergente"
          />
        </label>
        <div className="form-grid">
          <label>
            Quantidade
            <input
              name="quantity"
              type="number"
              defaultValue={item?.quantity ?? 1}
              min="0.001"
              max="1000000"
              step="0.001"
              required
            />
          </label>
          <label>
            Unidade
            <select name="unit" defaultValue={item?.unit || "un"}>
              {units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Categoria
          <select name="category" defaultValue={item?.category || "Mercearia"}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {item?.sourceType === "MENU" && (
          <small>
            Se alterares o nome, a quantidade ou a unidade, este produto passa a
            manual para preservar as tuas alterações.
          </small>
        )}
        <ErrorMessage error={action.error} />
        <button className="button primary" disabled={action.pending}>
          Guardar produto
        </button>
      </form>
    </Modal>
  );
}
function Favorites({ list }: { list?: ShoppingList }) {
  const { confirm, confirmationModal } = useConfirmation();
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [newFavorite, setNewFavorite] = useState(false);
  const action = useAction();
  const favorites = useQuery({
      queryKey: ["favorite-products"],
      queryFn: () => apiAll<FavoriteProduct>("/favorite-products"),
    }),
    frequent = useQuery({
      queryKey: ["frequent-products"],
      queryFn: () => api<FrequentProduct[]>("/products/most-purchased"),
    });
  async function add(products: FavoriteProduct[]) {
    if (!list) return;
    await action.run(
      async () => {
        for (const product of products)
          await api(`/shopping-lists/${list.id}/items`, "POST", {
            ...product,
            purchased: false,
          });
      },
      () => setSelected([]),
    );
  }
  return (
    <>
      {confirmationModal}
      <div className="section-toolbar">
        <div>
          <h2>Os produtos de sempre</h2>
          <p className="muted">
            Escolhidos por ti. Prontos para a próxima lista.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => setNewFavorite(true)}
        >
          <Plus size={16} />
          Novo favorito
        </button>
      </div>
      <div className="catalog-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Pesquisar favoritos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar nos favoritos…"
          />
        </label>
        <button
          className="button primary"
          disabled={!list || !selected.length || action.pending}
          onClick={() =>
            add(favorites.data?.filter((f) => selected.includes(f.id)) || [])
          }
        >
          Adicionar selecionados ({selected.length})
        </button>
      </div>
      {!list && (
        <div className="gentle-note">
          Cria uma lista para adicionar os teus favoritos.
        </div>
      )}
      <ErrorMessage error={action.error || favorites.error || frequent.error} />
      <div className="favorite-products">
        {favorites.data
          ?.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
          .map((f) => (
            <div className="favorite-product" key={f.id}>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={selected.includes(f.id)}
                  onChange={() =>
                    setSelected(
                      selected.includes(f.id)
                        ? selected.filter((id) => id !== f.id)
                        : [...selected, f.id],
                    )
                  }
                />
                <span>
                  <strong>{f.name}</strong>
                  <small>
                    {f.quantity} {f.unit} · {f.category}
                  </small>
                </span>
              </label>
              <button
                className="icon-button"
                aria-label={`Adicionar ${f.name} à lista`}
                disabled={!list || action.pending}
                onClick={() => add([f])}
              >
                <Plus size={18} />
              </button>
              <button
                className="icon-button delete"
                aria-label={`Remover favorito ${f.name}`}
                disabled={action.pending}
                onClick={async () => {
                  if (await confirm(`Remover ${f.name} dos favoritos?`))
                    void action.run(() =>
                      api(`/favorite-products/${f.id}`, "DELETE"),
                    );
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
      </div>
      {!favorites.data?.length && (
        <Empty title="Os teus habituais moram aqui">
          <p>Guarda um produto da lista com o coração ou cria um favorito.</p>
        </Empty>
      )}
      <h2 className="spaced-heading">Comprados com frequência</h2>
      <p className="muted">
        Sugestões baseadas nas listas guardadas. Não são favoritos automáticos.
      </p>
      <div className="favorite-products">
        {frequent.data?.map((f, index) => (
          <div className="favorite-product" key={index}>
            <div className="item-info">
              <strong>{f.name}</strong>
              <small>
                {f.frequency} compras · Última:{" "}
                {new Date(f.lastPurchasedAt).toLocaleDateString("pt-PT")}
              </small>
            </div>
            <button
              className="button secondary compact"
              disabled={!list || action.pending}
              onClick={() => add([f])}
            >
              <Plus size={15} />À lista
            </button>
          </div>
        ))}
      </div>
      {newFavorite && (
        <Modal
          title="Guardar um produto habitual"
          onClose={() => setNewFavorite(false)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void action.run(
                () =>
                  api("/favorite-products", "POST", {
                    ...Object.fromEntries(data),
                    quantity: Number(data.get("quantity")),
                  }),
                () => setNewFavorite(false),
              );
            }}
          >
            <label>
              Produto
              <input name="name" required maxLength={150} />
            </label>
            <div className="form-grid">
              <label>
                Quantidade habitual
                <input
                  type="number"
                  name="quantity"
                  min="0.001"
                  max="1000000"
                  step="0.001"
                  defaultValue="1"
                  required
                />
              </label>
              <label>
                Unidade
                <select name="unit">
                  {units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Categoria
              <select name="category">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <ErrorMessage error={action.error} />
            <button className="button primary" disabled={action.pending}>
              Guardar favorito
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
