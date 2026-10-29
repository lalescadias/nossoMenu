package pt.nossomenu;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static pt.nossomenu.Model.*;

class ShoppingCalculatorTest {
    Item item(String name,String unit,String q,String source,boolean bought){Item i=new Item();i.name=name;i.unit=unit;i.quantity=new BigDecimal(q);i.category="Mercearia";i.sourceType=source;i.purchased=bought;return i;}
    @Test void convertsKnownUnitsButDoesNotMixIncompatibleDimensions(){
        Recipe r=new Recipe();r.servings=new BigDecimal("4");Ingredient g=new Ingredient();g.name="Cebola";g.unit="kg";g.quantity=new BigDecimal("0.8");g.category="Legumes e verduras";r.ingredients.add(g);
        Ingredient count=new Ingredient();count.name="cebola";count.unit="un";count.quantity=BigDecimal.ONE;count.category=g.category;r.ingredients.add(count);
        Menu m=new Menu();for(int n=0;n<2;n++){Meal meal=new Meal();meal.recipeId=r.id;meal.servings=new BigDecimal("2.5");m.meals.add(meal);}
        List<Item> result=ShoppingCalculator.calculate(m,id->r);
        assertThat(result).hasSize(2);assertThat(result.getFirst().quantity).isEqualByComparingTo("1000");assertThat(result.getFirst().unit).isEqualTo("g");assertThat(result.getFirst().sources).hasSize(2);assertThat(result.get(1).quantity).isEqualByComparingTo("2");
    }
    @Test void syncPreservesManualAndPurchasedItemsAndTheirIdentity(){
        ShoppingList list=new ShoppingList();Item manual=item("Detergente","un","2","MANUAL",false),bought=item("Arroz","g","200","MENU",true),obsolete=item("Tomate","g","100","MENU",false),keptBought=item("Café","g","250","MENU",true);bought.purchasedBy=UUID.randomUUID();
        list.items.addAll(List.of(manual,bought,obsolete,keptBought));Item fresh=item("arroz","g","350","MENU",false),newProduct=item("Feijão","g","400","MENU",false);
        var preview=ShoppingCalculator.preview(list.items,List.of(fresh,newProduct));assertThat(preview.removed()).containsExactly(obsolete);assertThat(preview.retained()).contains(manual,keptBought);assertThat(list.items).hasSize(4);
        ShoppingCalculator.apply(list,List.of(fresh,newProduct));assertThat(list.items).contains(manual,bought,keptBought,newProduct).doesNotContain(obsolete);assertThat(bought.purchased).isTrue();assertThat(bought.purchasedBy).isNotNull();assertThat(bought.quantity).isEqualByComparingTo("350");assertThat(manual.quantity).isEqualByComparingTo("2");
    }
    @Test void roundsUpRatherThanLosingFractionalRequirements(){Recipe r=new Recipe();r.servings=new BigDecimal("3");Ingredient i=new Ingredient();i.name="Arroz";i.unit="g";i.quantity=BigDecimal.ONE;i.category="Mercearia";r.ingredients.add(i);Menu m=new Menu();Meal meal=new Meal();meal.servings=BigDecimal.ONE;meal.recipeId=r.id;m.meals.add(meal);assertThat(ShoppingCalculator.calculate(m,id->r).getFirst().quantity).isEqualByComparingTo("0.334");}
}
