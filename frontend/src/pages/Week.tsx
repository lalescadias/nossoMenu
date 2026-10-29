import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock3,
  RefreshCw,
  ShoppingBasket,
  Sun,
  Moon,
  Plus,
  Trash2,
  Leaf,
  CalendarDays,
} from "lucide-react";
import { api, apiAll } from "../api";
import { useApp, useUser } from "../main";
import { useAction } from "../useAction";
import { useConfirmation } from "../useConfirmation";
import { monday, shift, format, iso, weekLabel } from "../date";
import { Loading, ErrorMessage, Empty, DishArt, Modal } from "../ui";
import type { Menu, RecipeView, Family, Meal, Recipe } from "../types";

export function WeekPage() {
  const [week, setWeek] = useState(monday()),
    [replace, setReplace] = useState(false),
    [selection, setSelection] = useState<{
      meal?: Meal;
      day: string;
      type: string;
    } | null>(null);
  const action = useAction();
  const app = useApp(),
    user = useUser(),
    navigate = useNavigate();
  const menus = useQuery({
      queryKey: ["menus"],
      queryFn: () => apiAll<Menu>("/menus"),
    }),
    recipes = useQuery({
      queryKey: ["recipes"],
      queryFn: () => apiAll<RecipeView>("/recipes"),
    }),
    family = useQuery({
      queryKey: ["family"],
      queryFn: () => api<Family>("/families/current"),
    });
  const menu = menus.data?.find((m) => m.weekStart === week),
    lookup = new Map(recipes.data?.map((r) => [r.recipe.id, r.recipe]));
  async function generate() {
    await action.run(
      () =>
        api<Menu>("/menus/generate", "POST", {
          weekStart: week,
          replace: !!menu,
          version: menu?.version,
        }),
      () => setReplace(false),
    );
  }
  async function groceries() {
    if (!menu) return;
    await action.run(
      () =>
        api("/shopping-lists/from-menu", "POST", {
          name: `Compras · ${weekLabel(week)}`,
          menuId: menu.id,
        }),
      () => navigate("/compras"),
    );
  }
  const today = iso(new Date()),
    todayMeal = menu?.meals.find((m) => m.day === today && m.type === "LUNCH"),
    todayRecipe = todayMeal ? lookup.get(todayMeal.recipeId) : undefined;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            UM POUCO DE ORGANIZAÇÃO, MUITO MAIS TRANQUILIDADE
          </span>
          <h1>
            A nossa semana<span className="heading-dot">.</span>
          </h1>
          <p>Olá, {user.name.split(" ")[0]}. Vamos pôr boas ideias na mesa?</p>
        </div>
        <button
          className="button primary"
          disabled={action.pending || recipes.isPending}
          onClick={() => (menu ? setReplace(true) : generate())}
        >
          <Sparkles size={17} />
          {menu ? "Gerar novo menu" : "Gerar menu semanal"}
        </button>
      </div>
      <div className="week-hero">
        <div className="hero-copy">
          <span className="pill light">
            <Leaf size={13} /> Menos indecisões, mais sabor
          </span>
          <h2>
            A semana sabe melhor
            <br />
            quando está planeada.
          </h2>
          <p>
            Receitas simples, compras organizadas e mais
            <br className="desktop" /> tempo para o que realmente importa.
          </p>
          <NavLink to="/decidir" className="hero-link">
            O que vamos cozinhar hoje?
            <ArrowRight size={17} />
          </NavLink>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <div className="hero-orbit" />
          <div className="hero-fork">⌇</div>
          <div className="hero-plate">
            <span>🥗</span>
          </div>
          <span className="hero-tomato">🍅</span>
          <span className="hero-leaf">🌿</span>
          <span className="hero-lemon">🍋</span>
          <div className="hero-tag">
            <Clock3 size={15} /> Simples. Caseiro. Nosso.
          </div>
        </div>
      </div>
      <div className="week-layout">
        <section className="calendar-section">
          <div className="section-toolbar">
            <div>
              <span className="eyebrow">O MENU DA FAMÍLIA</span>
              <h2>{weekLabel(week)}</h2>
            </div>
            <div className="week-controls">
              <button
                className="icon-button bordered"
                aria-label="Semana anterior"
                onClick={() => setWeek(shift(week, -7))}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="button subtle compact"
                onClick={() => setWeek(monday())}
              >
                Esta semana
              </button>
              <button
                className="icon-button bordered"
                aria-label="Semana seguinte"
                onClick={() => setWeek(shift(week, 7))}
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
          <ErrorMessage error={menus.error || recipes.error || action.error} />
          {menus.isPending || recipes.isPending ? (
            <Loading />
          ) : !menu ? (
            <Empty title="Uma semana cheia de possibilidades">
              <p>
                Gera sete dias de refeições com base nas preferências da
                família.
              </p>
              <button
                className="button primary"
                disabled={action.pending}
                onClick={generate}
              >
                <Sparkles size={16} />
                Gerar o primeiro menu
              </button>
            </Empty>
          ) : (
            <div className="day-list">
              {Array.from({ length: 7 }, (_, i) => shift(week, i)).map(
                (day) => (
                  <article
                    className={`day-card ${day === today ? "today" : ""}`}
                    key={day}
                  >
                    <div className="day-heading">
                      <div>
                        <span className="day-number">
                          {format(day, { day: "2-digit" })}
                        </span>
                        <div>
                          <h3>{format(day, { weekday: "long" })}</h3>
                          <small>{format(day, { month: "long" })}</small>
                        </div>
                      </div>
                      {day === today && <span className="today-tag">HOJE</span>}
                    </div>
                    <div className="day-meals">
                      {(["LUNCH", "DINNER"] as const).map((type) => {
                        const meal = menu.meals.find(
                            (m) => m.day === day && m.type === type,
                          ),
                          recipe = meal ? lookup.get(meal.recipeId) : undefined;
                        return (
                          <div className="meal" key={type}>
                            <div className="meal-label">
                              {type === "LUNCH" ? (
                                <Sun size={13} />
                              ) : (
                                <Moon size={13} />
                              )}{" "}
                              {type === "LUNCH" ? "Almoço" : "Jantar"}
                            </div>
                            {recipe ? (
                              <div className="meal-body">
                                <button
                                  className="meal-recipe"
                                  onClick={() => app.openRecipe(recipe.id)}
                                >
                                  <DishArt recipe={recipe} small />
                                  <span>
                                    <strong>{recipe.name}</strong>
                                    <small>
                                      <Clock3 size={12} />
                                      {recipe.prepMinutes +
                                        recipe.cookMinutes}{" "}
                                      min{" "}
                                      <span>· {meal?.servings} porções</span>
                                    </small>
                                  </span>
                                </button>
                                <button
                                  className="icon-button change-meal"
                                  aria-label={`Alterar ${type === "LUNCH" ? "almoço" : "jantar"} de ${day}`}
                                  onClick={() =>
                                    setSelection({ meal, day, type })
                                  }
                                >
                                  <RefreshCw size={15} />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="add-meal"
                                onClick={() => setSelection({ day, type })}
                              >
                                <Plus size={15} />
                                Escolher refeição
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
        <aside className="week-aside">
          <section className="info-card">
            <div className="card-icon">
              <ShoppingBasket size={22} />
            </div>
            <span className="eyebrow">DA SEMANA PARA O CARRINHO</span>
            <h3>
              Já sabemos o que
              <br />é preciso comprar.
            </h3>
            <p>
              Transforma o menu numa lista de compras, com as quantidades para a
              tua família.
            </p>
            <button
              className="button primary full"
              disabled={!menu || action.pending}
              onClick={groceries}
            >
              Gerar lista de compras
              <ArrowRight size={16} />
            </button>
            <small>As listas anteriores ficam guardadas.</small>
          </section>
          <section className="family-card">
            <div className="section-title">
              <UsersIcon />
              <h3>À nossa medida</h3>
            </div>
            <p>
              {family.data?.adults ?? 2} adultos · {family.data?.children ?? 1}{" "}
              criança{family.data?.children !== 1 ? "s" : ""}
            </p>
            <div className="family-avatars" aria-hidden="true">
              <span>👩</span>
              <span>👨</span>
              <span>🧒</span>
            </div>
            <small>
              Porções ajustadas à tua família.
              <br />
              Equivalência infantil: {family.data?.childEquivalent ?? 0.5}{" "}
              porção.
            </small>
            <NavLink to="/familia" className="text-button">
              Gerir preferências
              <ArrowRight size={14} />
            </NavLink>
          </section>
          {todayRecipe && (
            <section className="today-recipe">
              <span className="eyebrow">HOJE À MESA</span>
              <h3>{todayRecipe.name}</h3>
              <button
                className="text-button"
                onClick={() => app.openRecipe(todayRecipe.id)}
              >
                Ver a receita
                <ArrowRight size={15} />
              </button>
            </section>
          )}
          <div className="little-note">
            <span>✳</span>
            <p>
              Planear não é complicar.
              <br />É abrir espaço para aproveitar.
            </p>
          </div>
        </aside>
      </div>
      {replace && (
        <Modal title="Gerar um novo menu?" onClose={() => setReplace(false)}>
          <p>
            As refeições desta semana serão substituídas. As listas de compras
            existentes não serão alteradas.
          </p>
          <ErrorMessage error={action.error} />
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setReplace(false)}
            >
              Manter menu
            </button>
            <button
              className="button primary"
              disabled={action.pending}
              onClick={generate}
            >
              Confirmar novo menu
            </button>
          </div>
        </Modal>
      )}
      {selection && menu && (
        <MealPicker
          menu={menu}
          selection={selection}
          onClose={() => setSelection(null)}
        />
      )}
    </>
  );
}
function UsersIcon() {
  return <CalendarDays size={18} />;
}
function MealPicker({
  menu,
  selection,
  onClose,
}: {
  menu: Menu;
  selection: { meal?: Meal; day: string; type: string };
  onClose: () => void;
}) {
  const { confirm, confirmationModal } = useConfirmation();
  const [baseVersion] = useState(menu.version);
  const [offset, setOffset] = useState(0),
    [manual, setManual] = useState(false),
    [search, setSearch] = useState("");
  const action = useAction();
  const suggestions = useQuery({
      queryKey: ["suggestions", offset],
      queryFn: () => api<Recipe[]>(`/meal-suggestions?offset=${offset}`),
    }),
    recipes = useQuery({
      queryKey: ["recipes"],
      queryFn: () => apiAll<RecipeView>("/recipes"),
    });
  const family = useQuery({
    queryKey: ["family"],
    queryFn: () => api<Family>("/families/current"),
  });
  const options = manual
    ? recipes.data
        ?.map((r) => r.recipe)
        .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : suggestions.data;
  async function choose(id: string) {
    const body = {
      recipeId: id,
      servings:
        selection.meal?.servings ??
        family.data!.adults +
          family.data!.children * family.data!.childEquivalent,
      version: baseVersion,
      day: selection.day,
      type: selection.type,
    };
    await action.run(
      () =>
        selection.meal
          ? api(`/menus/${menu.id}/meals/${selection.meal.id}`, "PUT", body)
          : api(`/menus/${menu.id}/meals`, "POST", body),
      onClose,
    );
  }
  return (
    <Modal
      title={`${selection.type === "LUNCH" ? "Almoço" : "Jantar"} de ${format(selection.day)}`}
      onClose={onClose}
    >
      {confirmationModal}
      <p>Uma pequena troca para a semana ficar mais tua.</p>
      <div className="tabs">
        <button
          className={!manual ? "active" : ""}
          onClick={() => setManual(false)}
        >
          Três alternativas
        </button>
        <button
          className={manual ? "active" : ""}
          onClick={() => setManual(true)}
        >
          Escolher no catálogo
        </button>
      </div>
      {manual && (
        <input
          aria-label="Pesquisar receita"
          placeholder="Pesquisar uma receita…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <ErrorMessage error={action.error || suggestions.error || family.error} />
      <div className="recipe-options">
        {options?.map((r) => (
          <button
            className="recipe-option"
            key={r.id}
            disabled={action.pending || !family.data}
            onClick={() => choose(r.id)}
          >
            <DishArt recipe={r} small />
            <span>
              <strong>{r.name}</strong>
              <small>
                {r.prepMinutes + r.cookMinutes} min · {r.category}
              </small>
            </span>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
      <div className="modal-actions">
        {selection.meal && (
          <button
            className="button danger"
            disabled={action.pending}
            onClick={async () => {
              if (await confirm("Remover esta refeição do menu?"))
                void action.run(
                  () =>
                    api(
                      `/menus/${menu.id}/meals/${selection.meal!.id}?version=${baseVersion}`,
                      "DELETE",
                    ),
                  onClose,
                );
            }}
          >
            <Trash2 size={15} />
            Remover
          </button>
        )}
        {!manual && (
          <button
            className="button secondary"
            onClick={() => setOffset(offset + 3)}
          >
            <RefreshCw size={15} />
            Outras sugestões
          </button>
        )}
      </div>
    </Modal>
  );
}
