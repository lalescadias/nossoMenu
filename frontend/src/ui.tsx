import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  X,
  LoaderCircle,
  ChefHat,
  Clock3,
  Heart,
  ArrowUpRight,
} from "lucide-react";
import type { Recipe } from "./types";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={wide ? "modal wide" : "modal"}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> A preparar tudo…
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <ChefHat size={32} />
      </div>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  return error ? (
    <div className="error" role="alert">
      {error instanceof Error
        ? error.message
        : "Não foi possível carregar os dados."}
    </div>
  ) : null;
}
const tones: Record<string, string> = {
  Frango: "peach",
  Carnes: "rose",
  Massas: "yellow",
  Peixe: "blue",
  "Refeições rápidas": "green",
  Sopas: "peach",
  Legumes: "green",
  "Arroz e feijão": "yellow",
  Acompanhamentos: "purple",
};
const symbols: Record<string, string> = {
  Frango: "🍗",
  Carnes: "🥘",
  Massas: "🍝",
  Peixe: "🐟",
  "Refeições rápidas": "🥗",
  Sopas: "🍲",
  Legumes: "🥦",
  "Arroz e feijão": "🍚",
  Acompanhamentos: "🥔",
};
export function DishArt({
  recipe,
  small = false,
}: {
  recipe: Recipe;
  small?: boolean;
}) {
  return (
    <div
      className={`dish-art ${tones[recipe.category] || "green"} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      <div className="plate">
        <span>{symbols[recipe.category] || "🍽️"}</span>
      </div>
      {!small && <span className="art-leaf">✳</span>}
    </div>
  );
}
export function RecipeCard({
  recipe,
  favorite,
  onOpen,
  onFavorite,
  onAdd,
}: {
  recipe: Recipe;
  favorite?: boolean;
  onOpen: () => void;
  onFavorite?: () => void;
  onAdd?: () => void;
}) {
  return (
    <article className="recipe-card">
      <button
        className="art-button"
        onClick={onOpen}
        aria-label={`Ver ${recipe.name}`}
      >
        <DishArt recipe={recipe} />
      </button>
      {onFavorite && (
        <button
          className={`favorite-button ${favorite ? "selected" : ""}`}
          onClick={onFavorite}
          aria-label={
            favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
          aria-pressed={favorite}
        >
          <Heart size={18} fill={favorite ? "currentColor" : "none"} />
        </button>
      )}
      <div className="recipe-card-body">
        <span className="eyebrow">
          {recipe.category} {recipe.sideDish ? "· Acompanhamento" : ""}
        </span>
        <button className="text-button recipe-title" onClick={onOpen}>
          {recipe.name}
        </button>
        <p>{recipe.description}</p>
        <div className="recipe-card-footer">
          <span>
            <Clock3 size={14} />
            {recipe.prepMinutes + recipe.cookMinutes} min
          </span>
          <button className="text-button" onClick={onAdd || onOpen}>
            {onAdd ? "Ao menu" : "Ver receita"}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
export const categories = [
  "Frutas",
  "Legumes e verduras",
  "Carnes",
  "Peixe",
  "Laticínios",
  "Mercearia",
  "Congelados",
  "Padaria",
  "Bebidas",
  "Higiene",
  "Limpeza",
  "Outros",
];
export const recipeCategories = [
  "Carnes",
  "Frango",
  "Peixe",
  "Massas",
  "Arroz e feijão",
  "Legumes",
  "Sopas",
  "Refeições rápidas",
  "Acompanhamentos",
];
export const units = [
  "g",
  "kg",
  "ml",
  "l",
  "un",
  "colher sopa",
  "colher chá",
  "q.b.",
];
