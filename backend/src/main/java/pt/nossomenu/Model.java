package pt.nossomenu;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Relational aggregates. API responses are explicitly mapped; passwords never leave the server. */
public final class Model {
    @MappedSuperclass
    public static abstract class Row {
        @Id public UUID id = UUID.randomUUID();
        @Version public long version;
        public Instant createdAt = Instant.now();
        public Instant updatedAt = Instant.now();
        @PreUpdate void touch() { updatedAt = Instant.now(); }
    }
    @Entity(name="Account") @Table(name="accounts")
    public static class Account extends Row {
        public String name;
        @Column(unique=true) public String email;
        public String passwordHash;
        public UUID familyId;
        public String role = "OWNER";
        public long passwordRevision;
    }
    @Entity(name="Family") @Table(name="families")
    public static class Family extends Row {
        public String name;
        public int adults = 2;
        public int children = 1;
        public BigDecimal childEquivalent = new BigDecimal("0.5");
        public int maxMinutes = 20;
        public boolean repeatDinner = true;
        public String cuisines = "Portuguesa,Brasileira";
        public BigDecimal servings() { return BigDecimal.valueOf(adults).add(childEquivalent.multiply(BigDecimal.valueOf(children))); }
    }
    @Entity(name="Invitation") @Table(name="invitations")
    public static class Invitation extends Row {
        public UUID familyId;
        public String email;
        @Column(unique=true) public String tokenHash;
        public Instant expiresAt;
        public boolean used;
    }
    @Entity(name="Recipe") @Table(name="recipes")
    public static class Recipe extends Row {
        public UUID familyId;
        public String name;
        public String description;
        public String category;
        public String cuisine;
        public int prepMinutes;
        public int cookMinutes;
        public BigDecimal servings;
        public boolean sideDish;
        @Column(length=10000) public String instructions;
        @OneToMany(cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.EAGER)
        @JoinColumn(name="recipe_id") @OrderBy("name ASC")
        public List<Ingredient> ingredients = new ArrayList<>();
    }
    @Entity(name="Ingredient") @Table(name="recipe_ingredients")
    public static class Ingredient extends Row {
        public UUID productId;
        public String name;
        public String category;
        public BigDecimal quantity;
        public String unit;
    }
    @Entity(name="FavoriteRecipe") @Table(name="favorite_recipes",uniqueConstraints=@UniqueConstraint(columnNames={"familyId","recipeId"}))
    public static class FavoriteRecipe extends Row { public UUID familyId; public UUID recipeId; }
    @Entity(name="Menu") @Table(name="menus",uniqueConstraints=@UniqueConstraint(columnNames={"familyId","weekStart"}))
    public static class Menu extends Row {
        public UUID familyId;
        public LocalDate weekStart;
        @OneToMany(cascade=CascadeType.ALL, orphanRemoval=true,fetch=FetchType.EAGER) @JoinColumn(name="menu_id") @OrderBy("day ASC, type ASC")
        public List<Meal> meals = new ArrayList<>();
    }
    @Entity(name="Meal") @Table(name="meals")
    public static class Meal extends Row { @Column(name="meal_date") public LocalDate day; public String type; public UUID recipeId; public BigDecimal servings; }
    @Entity(name="ShoppingList") @Table(name="shopping_lists")
    public static class ShoppingList extends Row {
        public UUID familyId;
        public UUID menuId;
        public String name;
        public LocalDate startDate;
        public LocalDate endDate;
        public String status = "ACTIVE";
        @OneToMany(cascade=CascadeType.ALL,orphanRemoval=true,fetch=FetchType.EAGER) @JoinColumn(name="list_id") @OrderBy("position ASC, createdAt ASC")
        public List<Item> items = new ArrayList<>();
    }
    @Entity(name="Item") @Table(name="shopping_items")
    public static class Item extends Row {
        public UUID productId;
        public String name;
        public String category;
        public BigDecimal quantity;
        public String unit;
        public String sourceType = "MANUAL";
        public boolean purchased;
        public UUID purchasedBy;
        public Instant purchasedAt;
        public int position;
        @OneToMany(cascade=CascadeType.ALL,orphanRemoval=true,fetch=FetchType.EAGER) @JoinColumn(name="item_id")
        public List<ItemSource> sources = new ArrayList<>();
    }
    @Entity(name="ItemSource") @Table(name="shopping_item_sources")
    public static class ItemSource extends Row { public UUID mealId; public UUID ingredientId; public UUID recipeId; public String recipeName; public String ingredientName; public LocalDate mealDate; public String mealType; public BigDecimal quantity; public String unit; }
    @Entity(name="FavoriteProduct") @Table(name="favorite_products")
    public static class FavoriteProduct extends Row { public UUID familyId; public UUID productId; public String name; public String category; public BigDecimal quantity; public String unit; }
    @Entity(name="Product") @Table(name="products")
    public static class Product extends Row { public UUID familyId; public String canonicalName; public String normalizedName; public String category; public String defaultUnit; }
    @Entity(name="PasswordReset") @Table(name="password_resets")
    public static class PasswordReset extends Row { public UUID accountId; public String tokenHash; public Instant expiresAt; public boolean used; }
    @Entity(name="Activity") @Table(name="activity")
    public static class Activity extends Row { public UUID familyId; public UUID userId; public String userName; public String action; public UUID entityId; public String summary; }
}
