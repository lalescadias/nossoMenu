package pt.nossomenu;

import java.math.*;
import java.text.Normalizer;
import java.util.*;
import java.util.function.Function;
import static pt.nossomenu.Model.*;

/** Pure calculation; no network, persistence or hidden changes to existing lists. */
public class ShoppingCalculator {
    public static String normalize(String name) { return Normalizer.normalize(name.trim().toLowerCase(Locale.ROOT),Normalizer.Form.NFD).replaceAll("\\p{M}","").replaceAll("\\s+"," "); }
    public static String key(Item i) { return (i.productId==null?normalize(i.name):i.productId.toString())+"|"+i.unit; }
    public record Amount(BigDecimal quantity,String unit) {}
    public static Amount convert(BigDecimal q,String unit) {
        return switch(unit) {case "kg" -> new Amount(q.multiply(BigDecimal.valueOf(1000)),"g"); case "l" -> new Amount(q.multiply(BigDecimal.valueOf(1000)),"ml"); default -> new Amount(q,unit);};
    }
    public static List<Item> calculate(Menu menu,Function<UUID,Recipe> recipes) {
        Map<String,Item> totals=new LinkedHashMap<>();
        for(Meal meal:menu.meals) {
            Recipe recipe=recipes.apply(meal.recipeId);
            for(Ingredient ingredient:recipe.ingredients) {
                var amount=convert(ingredient.quantity.multiply(meal.servings).divide(recipe.servings,8,RoundingMode.CEILING),ingredient.unit);
                Item candidate=new Item(); candidate.productId=ingredient.productId; candidate.name=ingredient.name; candidate.category=ingredient.category; candidate.unit=amount.unit; candidate.quantity=BigDecimal.ZERO; candidate.sourceType="MENU";
                Item item=totals.computeIfAbsent(key(candidate),k->candidate);
                item.quantity=item.quantity.add(amount.quantity);
                ItemSource source=new ItemSource(); source.mealId=meal.id; source.ingredientId=ingredient.id; source.recipeId=recipe.id; source.recipeName=recipe.name; source.ingredientName=ingredient.name; source.mealDate=meal.day; source.mealType=meal.type; source.quantity=amount.quantity; source.unit=amount.unit; item.sources.add(source);
            }
        }
        totals.values().forEach(i->i.quantity=i.quantity.setScale(i.unit.equals("un")?0:3,RoundingMode.CEILING).stripTrailingZeros());
        return new ArrayList<>(totals.values());
    }
    public record Preview(List<Item> added,List<Item> changed,List<Item> removed,List<Item> retained) {}
    public static Preview preview(List<Item> current,List<Item> calculated) {
        Map<String,Item> wanted=new LinkedHashMap<>(); calculated.forEach(i->wanted.put(key(i),i));
        List<Item> changed=new ArrayList<>(),removed=new ArrayList<>(),retained=new ArrayList<>();
        for(Item old:current) {
            if(!old.sourceType.equals("MENU")) { retained.add(old); continue; }
            Item fresh=wanted.remove(key(old));
            if(fresh==null) { if(old.purchased) retained.add(old); else removed.add(old); }
            else { fresh.id=old.id; if(fresh.quantity.compareTo(old.quantity)!=0) changed.add(fresh); else retained.add(old); }
        }
        return new Preview(new ArrayList<>(wanted.values()),changed,removed,retained);
    }
    public static void apply(ShoppingList list,List<Item> calculated) {
        Map<String,Item> wanted=new LinkedHashMap<>(); calculated.forEach(i->wanted.put(key(i),i));
        var iterator=list.items.iterator();
        while(iterator.hasNext()) {
            Item old=iterator.next(); if(!old.sourceType.equals("MENU")) continue;
            Item fresh=wanted.remove(key(old));
            if(fresh==null) { if(!old.purchased) iterator.remove(); }
            else { old.quantity=fresh.quantity; old.sources.clear(); old.sources.addAll(fresh.sources); }
        }
        list.items.addAll(wanted.values());
    }
}
