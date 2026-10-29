import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Clock3,
  Heart,
  Users,
  Copy,
  Pencil,
  Trash2,
  ArrowRight,
  Minus,
} from "lucide-react";
import { api, apiAll } from "../api";
import { useApp } from "../main";
import { useAction } from "../useAction";
import {
  Loading,
  ErrorMessage,
  Empty,
  Modal,
  RecipeCard,
  DishArt,
  recipeCategories,
  categories,
  units,
} from "../ui";
import { iso, monday, weekLabel } from "../date";
import type { RecipeView, Recipe, Family, Menu } from "../types";

export function RecipesPage() {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [max, setMax] = useState(""),
    [favorites, setFavorites] = useState(false),
    [create, setCreate] = useState(false);
  const app = useApp(),
    action = useAction();
  const recipes = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiAll<RecipeView>("/recipes"),
  });
  const filtered = recipes.data?.filter(
    ({ recipe: r, favorite }) =>
      (!favorites || favorite) &&
      r.name.toLocaleLowerCase("pt").includes(search.toLocaleLowerCase("pt")) &&
      (!category || r.category === category) &&
      (!max || r.prepMinutes + r.cookMinutes <= Number(max)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">OS SABORES QUE JÁ SÃO DE CASA</span>
          <h1>
            As nossas receitas<span className="heading-dot">.</span>
          </h1>
          <p>Clássicos de sempre e novas ideias para o dia a dia.</p>
        </div>
        <button className="button primary" onClick={() => setCreate(true)}>
          <Plus size={17} />
          Nova receita
        </button>
      </div>
      <div className="catalog-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar uma receita…"
            aria-label="Pesquisar receitas"
          />
        </label>
        <select
          aria-label="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {recipeCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Tempo máximo"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        >
          <option value="">Qualquer tempo</option>
          <option value="20">Até 20 minutos</option>
          <option value="30">Até 30 minutos</option>
          <option value="60">Até 1 hora</option>
        </select>
        <button
          className={`button ${favorites ? "primary" : "secondary"}`}
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Heart size={16} />
          Favoritas
        </button>
      </div>
      <ErrorMessage error={recipes.error || action.error} />
      <div className="results-label">
        {filtered?.length ?? 0} receitas para inspirar a semana
      </div>
      {recipes.isPending ? (
        <Loading />
      ) : !filtered?.length ? (
        <Empty title="Não encontrámos essa receita">
          <p>Experimenta outro nome ou ajusta os filtros.</p>
        </Empty>
      ) : (
        <div className="recipe-grid">
          {filtered.map(({ recipe, favorite }) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              favorite={favorite}
              onOpen={() => app.openRecipe(recipe.id)}
              onAdd={() => app.addToMenu(recipe.id)}
              onFavorite={() => {
                if (!action.pending)
                  void action.run(() =>
                    api(
                      `/recipes/${recipe.id}/favorite`,
                      favorite ? "DELETE" : "POST",
                    ),
                  );
              }}
            />
          ))}
        </div>
      )}
      {create && <RecipeEditor onClose={() => setCreate(false)} />}
    </>
  );
}
export function RecipeDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const recipe = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => api<Recipe>(`/recipes/${id}`),
  });
  const app = useApp(),
    action = useAction();
  const [editing, setEditing] = useState(false),
    [copy, setCopy] = useState(false),
    [servings, setServings] = useState<number | null>(null);
  const r = recipe.data;
  if (editing && r)
    return (
      <RecipeEditor recipe={r} copy={copy} onClose={() => setEditing(false)} />
    );
  return (
    <Modal title={r?.name || "A nossa receita"} onClose={onClose} wide>
      {recipe.isPending ? (
        <Loading />
      ) : r ? (
        <>
          <div className="recipe-detail-top">
            <DishArt recipe={r} />
            <div>
              <span className="eyebrow">
                {r.cuisine} · {r.category}
              </span>
              <p>{r.description}</p>
              <div className="recipe-facts">
                <span>
                  <Clock3 size={17} />
                  {r.prepMinutes + r.cookMinutes} min no total
                </span>
                <span>
                  <Users size={17} />
                  {r.servings} porções de referência
                </span>
              </div>
              <small>
                Preparação: {r.prepMinutes} min · Confeção: {r.cookMinutes} min
              </small>
              {r.sideDish && <p className="pill">Acompanhamento</p>}
            </div>
          </div>
          <div className="detail-columns">
            <section>
              <div className="section-title">
                <h3>Ingredientes</h3>
                <label className="servings-input">
                  <input
                    type="number"
                    aria-label="Porções para consultar"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={servings ?? r.servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                  />
                  porções
                </label>
              </div>
              <ul className="ingredient-list">
                {r.ingredients.map((i) => (
                  <li key={i.id}>
                    <span>{i.name}</span>
                    <strong>
                      {Math.ceil(
                        ((i.quantity * (servings ?? r.servings)) / r.servings) *
                          1000,
                      ) / 1000}{" "}
                      {i.unit}
                    </strong>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Como preparar</h3>
              <p className="instructions">{r.instructions}</p>
              <div className="gentle-note">
                As quantidades adaptam-se às porções. Ajusta os temperos ao
                gosto da família.
              </div>
            </section>
          </div>
          <ErrorMessage error={action.error} />
          <div className="modal-actions wrap">
            {r.familyId ? (
              <>
                <button
                  className="button secondary"
                  onClick={() => {
                    setCopy(false);
                    setEditing(true);
                  }}
                >
                  <Pencil size={15} />
                  Editar
                </button>
                <button
                  className="button danger"
                  disabled={action.pending}
                  onClick={() => {
                    if (window.confirm("Eliminar esta receita familiar?"))
                      void action.run(
                        () =>
                          api(
                            `/recipes/${r.id}?version=${r.version}`,
                            "DELETE",
                          ),
                        onClose,
                      );
                  }}
                >
                  <Trash2 size={15} />
                  Eliminar
                </button>
              </>
            ) : (
              <button
                className="button secondary"
                onClick={() => {
                  setCopy(true);
                  setEditing(true);
                }}
              >
                <Copy size={15} />
                Criar cópia própria
              </button>
            )}
            <button
              className="button primary"
              onClick={() => {
                app.addToMenu(r.id);
                onClose();
              }}
            >
              <Plus size={16} />
              Adicionar ao menu
            </button>
          </div>
        </>
      ) : null}
      <ErrorMessage error={recipe.error} />
    </Modal>
  );
}
type DraftIngredient = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};
export function RecipeEditor({
  recipe: initialRecipe,
  copy = false,
  onClose,
}: {
  recipe?: Recipe;
  copy?: boolean;
  onClose: () => void;
}) {
  const [recipe] = useState(initialRecipe);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    recipe?.ingredients.map(({ name, quantity, unit, category }) => ({
      name,
      quantity,
      unit,
      category,
    })) || [{ name: "", quantity: 1, unit: "g", category: "Mercearia" }],
  );
  const action = useAction();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      ...Object.fromEntries(form),
      prepMinutes: Number(form.get("prepMinutes")),
      cookMinutes: Number(form.get("cookMinutes")),
      servings: Number(form.get("servings")),
      sideDish: form.get("sideDish") === "on",
      ingredients,
      version: recipe?.version ?? 0,
    };
    await action.run(
      () =>
        api(
          recipe && !copy ? `/recipes/${recipe.id}` : "/recipes",
          recipe && !copy ? "PUT" : "POST",
          body,
        ),
      onClose,
    );
  }
  function update(
    index: number,
    field: keyof DraftIngredient,
    value: string | number,
  ) {
    setIngredients((old) =>
      old.map((i, n) => (n === index ? { ...i, [field]: value } : i)),
    );
  }
  return (
    <Modal
      title={
        recipe && !copy
          ? "Editar receita"
          : copy
            ? "Uma versão à nossa maneira"
            : "Nova receita da família"
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="form-stack">
        <div className="form-grid">
          <label>
            Nome da receita
            <input
              name="name"
              defaultValue={
                recipe ? recipe.name + (copy ? " (da família)" : "") : ""
              }
              maxLength={150}
              required
            />
          </label>
          <label>
            Categoria
            <select
              name="category"
              defaultValue={recipe?.category || "Refeições rápidas"}
            >
              {recipeCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Descrição curta
            <input
              name="description"
              defaultValue={recipe?.description || ""}
              maxLength={255}
            />
          </label>
          <label>
            Cozinha
            <select
              name="cuisine"
              defaultValue={recipe?.cuisine || "Portuguesa"}
            >
              <option>Portuguesa</option>
              <option>Brasileira</option>
            </select>
          </label>
          <label>
            Preparação (min)
            <input
              name="prepMinutes"
              type="number"
              min="0"
              max="1440"
              defaultValue={recipe?.prepMinutes ?? 10}
              required
            />
          </label>
          <label>
            Confeção (min)
            <input
              name="cookMinutes"
              type="number"
              min="0"
              max="1440"
              defaultValue={recipe?.cookMinutes ?? 10}
              required
            />
          </label>
          <label>
            Porções de referência
            <input
              name="servings"
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              defaultValue={recipe?.servings ?? 4}
              required
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="sideDish"
              defaultChecked={recipe?.sideDish}
            />
            É um acompanhamento
          </label>
        </div>
        <h3>Ingredientes</h3>
        <div className="ingredient-editor">
          {ingredients.map((i, index) => (
            <div className="ingredient-row" key={index}>
              <input
                aria-label={`Ingrediente ${index + 1}`}
                placeholder="Ingrediente"
                value={i.name}
                onChange={(e) => update(index, "name", e.target.value)}
                required
                maxLength={150}
              />
              <input
                aria-label={`Quantidade ${index + 1}`}
                type="number"
                min="0.001"
                max="1000000"
                step="0.001"
                value={i.quantity}
                onChange={(e) =>
                  update(index, "quantity", Number(e.target.value))
                }
                required
              />
              <select
                aria-label={`Unidade ${index + 1}`}
                value={i.unit}
                onChange={(e) => update(index, "unit", e.target.value)}
              >
                {units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <select
                aria-label={`Categoria ${index + 1}`}
                value={i.category}
                onChange={(e) => update(index, "category", e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button
                className="icon-button"
                type="button"
                aria-label={`Remover ingrediente ${index + 1}`}
                disabled={ingredients.length === 1}
                onClick={() =>
                  setIngredients(ingredients.filter((_, n) => n !== index))
                }
              >
                <Minus size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="button secondary fit"
          type="button"
          onClick={() =>
            setIngredients([
              ...ingredients,
              { name: "", quantity: 1, unit: "g", category: "Mercearia" },
            ])
          }
        >
          <Plus size={15} />
          Adicionar ingrediente
        </button>
        <label>
          Preparação
          <textarea
            name="instructions"
            rows={5}
            defaultValue={recipe?.instructions}
            maxLength={10000}
            required
            placeholder="Explica como preparar esta receita…"
          />
        </label>
        <ErrorMessage error={action.error} />
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={action.pending}>
            Guardar receita
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function AddToMenu({
  recipeId,
  onClose,
}: {
  recipeId: string;
  onClose: () => void;
}) {
  const [date, setDate] = useState(iso(new Date())),
    [type, setType] = useState("BOTH"),
    [confirm, setConfirm] = useState(false),
    [confirmVersion, setConfirmVersion] = useState<number | null>(null);
  const action = useAction();
  const menus = useQuery({
      queryKey: ["menus"],
      queryFn: () => apiAll<Menu>("/menus"),
    }),
    family = useQuery({
      queryKey: ["family"],
      queryFn: () => api<Family>("/families/current"),
    });
  const week = monday(new Date(date + "T12:00:00")),
    menu = menus.data?.find((m) => m.weekStart === week);
  const types = type === "BOTH" ? ["LUNCH", "DINNER"] : [type];
  const exists = menu?.meals.some(
    (m) => m.day === date && types.includes(m.type),
  );
  async function save() {
    if (exists && !confirm) {
      setConfirmVersion(menu?.version ?? null);
      setConfirm(true);
      return;
    }
    await action.run(async () => {
      // For an empty week, create its aggregate without manufacturing other meals.
      const current =
        menu || (await api<Menu>("/menus", "POST", { weekStart: week }));
      await api(`/menus/${current.id}/day`, "PUT", {
        day: date,
        type,
        recipeId,
        servings:
          (family.data?.adults ?? 2) +
          (family.data?.children ?? 1) * (family.data?.childEquivalent ?? 0.5),
        version: confirm ? confirmVersion : current.version,
      });
    }, onClose);
  }
  return (
    <Modal title="Mais uma boa ideia no menu" onClose={onClose}>
      <p>Escolhe quando levar esta receita à mesa.</p>
      <div className="form-stack">
        <label>
          Dia
          <input
            type="date"
            value={date}
            required
            onChange={(e) => {
              setDate(e.target.value);
              setConfirm(false);
            }}
          />
        </label>
        <label>
          Refeição
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setConfirm(false);
            }}
          >
            <option value="BOTH">Almoço e jantar</option>
            <option value="LUNCH">Só almoço</option>
            <option value="DINNER">Só jantar</option>
          </select>
        </label>
        {confirm && (
          <div className="gentle-note">
            Já existe uma refeição neste dia. Confirma a substituição? As
            compras não serão alteradas.
          </div>
        )}
        <ErrorMessage error={action.error || menus.error} />
        <button
          className="button primary"
          disabled={
            action.pending || menus.isPending || family.isPending || !date
          }
          onClick={save}
        >
          {confirm ? "Confirmar substituição" : "Guardar no menu"}
          <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
