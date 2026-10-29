import { useState } from "react";
import { Sparkles, Shuffle, RefreshCw } from "lucide-react";
import { api } from "../api";
import { useApp } from "../main";
import { useAction } from "../useAction";
import { RecipeCard, Empty, ErrorMessage, recipeCategories } from "../ui";
import type { Recipe } from "../types";
export function DecidePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]),
    [offset, setOffset] = useState(0),
    [max, setMax] = useState("20"),
    [category, setCategory] = useState("");
  const app = useApp(),
    action = useAction();
  async function suggest(count: number, random = false) {
    const next = offset + recipes.length;
    const filters = `${max ? "&maxMinutes=" + max : ""}${category ? "&category=" + encodeURIComponent(category) : ""}`;
    await action.run(
      () =>
        api<Recipe[]>(
          random
            ? `/meal-suggestions/random?count=1${filters}`
            : `/meal-suggestions?count=${count}&offset=${next}${filters}`,
        ),
      (r) => {
        setRecipes(r);
        setOffset(next);
      },
    );
  }
  return (
    <>
      <div className="decide-intro">
        <span className="pill">
          <Sparkles size={14} /> UMA AJUDA PARA A DECISÃO DO DIA
        </span>
        <h1>
          O que vamos
          <br />
          <em>cozinhar hoje?</em>
        </h1>
        <p>
          Às vezes, só precisamos de uma boa ideia.
          <br />
          Nós sugerimos. A família escolhe.
        </p>
        <div className="decide-filters">
          <select
            aria-label="Tempo máximo"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          >
            <option value="20">Até 20 minutos</option>
            <option value="30">Até 30 minutos</option>
            <option value="">Sem limite de tempo</option>
          </select>
          <select
            aria-label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {recipeCategories
              .filter((c) => c !== "Acompanhamentos")
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </div>
        <div className="decide-buttons">
          <button
            className="button primary"
            disabled={action.pending}
            onClick={() => suggest(1, true)}
          >
            <Shuffle size={17} />
            Surpreende-me
          </button>
          <button
            className="button secondary"
            disabled={action.pending}
            onClick={() => suggest(3)}
          >
            <Sparkles size={17} />
            Mostrar três opções
          </button>
        </div>
      </div>
      <ErrorMessage error={action.error} />
      {recipes.length ? (
        <>
          <div className="section-toolbar">
            <h2>Que tal uma destas?</h2>
            <button
              className="text-button"
              disabled={action.pending}
              onClick={() => suggest(recipes.length)}
            >
              <RefreshCw size={15} />
              Outras sugestões
            </button>
          </div>
          <div className="recipe-grid suggestions-grid">
            {recipes.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                onOpen={() => app.openRecipe(r.id)}
                onAdd={() => app.addToMenu(r.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <Empty title="A próxima ideia pode ser a favorita de todos">
          <p>
            As sugestões usam o nosso catálogo e as preferências da tua família.
          </p>
        </Empty>
      )}
      <p className="small-center">
        Receitas reais. Sugestões sem inteligência artificial.
      </p>
    </>
  );
}
