export interface Row {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Account {
  id: string;
  name: string;
  email: string;
  familyId: string;
  role: string;
}
export interface Family extends Row {
  name: string;
  adults: number;
  children: number;
  childEquivalent: number;
  maxMinutes: number;
  repeatDinner: boolean;
  cuisines: string;
}
export interface Ingredient extends Row {
  name: string;
  category: string;
  quantity: number;
  unit: string;
}
export interface Recipe extends Row {
  familyId: string | null;
  name: string;
  description: string;
  category: string;
  cuisine: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  sideDish: boolean;
  instructions: string;
  ingredients: Ingredient[];
}
export interface RecipeView {
  recipe: Recipe;
  favorite: boolean;
  origin: string;
}
export interface Meal extends Row {
  day: string;
  type: "LUNCH" | "DINNER";
  recipeId: string;
  servings: number;
}
export interface Menu extends Row {
  familyId: string;
  weekStart: string;
  meals: Meal[];
}
export interface Item extends Row {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  sourceType: string;
  purchased: boolean;
  purchasedBy: string | null;
  purchasedAt: string | null;
  position: number;
  sources: {
    mealId: string;
    ingredientId: string;
    quantity: number;
    unit: string;
  }[];
}
export interface ShoppingList extends Row {
  name: string;
  menuId: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  items: Item[];
}
export interface FavoriteProduct extends Row {
  name: string;
  category: string;
  quantity: number;
  unit: string;
}
export interface FrequentProduct extends FavoriteProduct {
  frequency: number;
  lastPurchasedAt: string;
}
export interface Activity extends Row {
  userName: string;
  action: string;
  summary: string;
  userId: string;
}
export interface SyncPreview {
  token: string;
  changes: {
    added: Item[];
    changed: Item[];
    removed: Item[];
    retained: Item[];
  };
}
