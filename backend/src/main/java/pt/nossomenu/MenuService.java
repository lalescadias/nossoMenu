package pt.nossomenu;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import static pt.nossomenu.Model.*;

@Service @Transactional
public class MenuService {
    final Store db; final Events events; final Products products; final SuggestionProvider suggestions;
    MenuService(Store db,Events events,Products products,SuggestionProvider suggestions) {this.db=db;this.events=events;this.products=products;this.suggestions=suggestions;}
    Account account(java.security.Principal principal) {return db.get(Account.class,UUID.fromString(principal.getName()));}
    static void require(boolean condition,String message) { if(!condition) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
    static void version(Row row,long version) { if(row.version!=version) throw new ResponseStatusException(HttpStatus.CONFLICT,"Os dados mudaram. Atualize antes de guardar."); }
    <T extends Row> T owned(Class<T> type,UUID id,UUID family) {
        T row=db.get(type,id);
        UUID actual=switch(row) {case Menu m -> m.familyId; case ShoppingList l -> l.familyId; case FavoriteProduct f -> f.familyId; case Recipe r -> r.familyId; default -> null;};
        if(!family.equals(actual)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Registo não encontrado."); return row;
    }
    Recipe recipe(UUID id,UUID family) { Recipe r=db.get(Recipe.class,id); if(r.familyId!=null&&!r.familyId.equals(family)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Receita não encontrada."); return r; }
    List<Recipe> recipes(UUID family) { return db.query(Recipe.class,"where x.familyId is null or x.familyId = ?1 order by x.name",family); }
    void audit(Account a,String action,UUID entity,String summary) { Activity log=new Activity();log.familyId=a.familyId;log.userId=a.id;log.userName=a.name;log.action=action;log.entityId=entity;log.summary=summary;db.save(log);events.changed(a.familyId); }
    List<Recipe> suggestions(Account a,int count,int offset,Integer max,String category) {
        Family family=db.get(Family.class,a.familyId); Set<UUID> favorites=new HashSet<>();db.family(FavoriteRecipe.class,a.familyId).forEach(f->favorites.add(f.recipeId));
        Map<UUID,Integer> recent=new HashMap<>(); db.family(Menu.class,a.familyId).stream().filter(m->!m.weekStart.isBefore(LocalDate.now().minusDays(28))).flatMap(m->m.meals.stream()).forEach(m->recent.merge(m.recipeId,1,Integer::sum));
        var eligible=suggestions.rank(recipes(a.familyId).stream().filter(r->max==null||r.prepMinutes+r.cookMinutes<=max).filter(r->category==null||category.isBlank()||r.category.equals(category)).toList(),family,favorites,recent);
        if(eligible.isEmpty()) return List.of();
        List<Recipe> result=new ArrayList<>();for(int i=0;i<Math.min(count,eligible.size());i++) result.add(eligible.get(Math.floorMod(offset+i,eligible.size())));return result;
    }
    Menu generate(Account a,LocalDate date,boolean replace,Long expected) {
        LocalDate monday=date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        Menu menu=db.query(Menu.class,"where x.familyId = ?1 and x.weekStart = ?2",a.familyId,monday).stream().findFirst().orElse(null);
        if(menu!=null) { db.lock(menu); if(!replace||expected==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Confirme a substituição do menu existente.");version(menu,expected);menu.meals.clear();db.flush(); }
        else {menu=new Menu();menu.familyId=a.familyId;menu.weekStart=monday;db.save(menu);}
        List<Recipe> choices=suggestions(a,100,0,null,null);require(!choices.isEmpty(),"Não existem receitas compatíveis com as preferências.");
        Family family=db.get(Family.class,a.familyId);
        for(int day=0;day<7;day++) for(int t=0;t<2;t++) { Meal meal=new Meal(); meal.day=monday.plusDays(day);meal.type=t==0?"LUNCH":"DINNER";meal.recipeId=choices.get((day+(family.repeatDinner?0:t))%choices.size()).id;meal.servings=family.servings();menu.meals.add(meal); }
        menu.updatedAt=Instant.now();audit(a,"MENU_GENERATED",menu.id,"Menu da semana de "+monday);return menu;
    }
    void changeMeal(Account a,UUID menuId,UUID mealId,UUID recipeId,BigDecimal servings,long expected,boolean remove) {
        Menu menu=owned(Menu.class,menuId,a.familyId);db.lock(menu);version(menu,expected);
        Meal meal=menu.meals.stream().filter(m->m.id.equals(mealId)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(remove) menu.meals.remove(meal);
        else { recipe(recipeId,a.familyId);require(servings!=null&&servings.signum()>0&&servings.compareTo(BigDecimal.valueOf(100))<=0,"Porções inválidas.");meal.recipeId=recipeId;meal.servings=servings; }
        menu.updatedAt=Instant.now();audit(a,"MEAL_CHANGED",menu.id,"Refeição de "+meal.day+" alterada");
    }
    Meal addMeal(Account a,UUID menuId,LocalDate day,String type,UUID recipeId,BigDecimal servings,long expected) {
        Menu menu=owned(Menu.class,menuId,a.familyId);db.lock(menu);version(menu,expected);recipe(recipeId,a.familyId);
        require(!day.isBefore(menu.weekStart)&&day.isBefore(menu.weekStart.plusDays(7)),"Dia fora da semana.");require(Set.of("LUNCH","DINNER").contains(type),"Refeição inválida.");require(servings!=null&&servings.signum()>0&&servings.compareTo(BigDecimal.valueOf(100))<=0,"Porções inválidas.");
        Meal meal=menu.meals.stream().filter(m->m.day.equals(day)&&m.type.equals(type)).findFirst().orElse(null);if(meal==null){meal=new Meal();meal.day=day;meal.type=type;menu.meals.add(meal);}meal.recipeId=recipeId;meal.servings=servings;menu.updatedAt=Instant.now();audit(a,"MEAL_CHANGED",menu.id,"Refeição adicionada");return meal;
    }
    Menu setDay(Account a,UUID menuId,LocalDate day,String type,UUID recipeId,BigDecimal servings,long expected){
        Menu menu=owned(Menu.class,menuId,a.familyId);db.lock(menu);version(menu,expected);recipe(recipeId,a.familyId);
        require(day!=null&&!day.isBefore(menu.weekStart)&&day.isBefore(menu.weekStart.plusDays(7)),"Dia fora da semana.");require(type!=null&&Set.of("LUNCH","DINNER","BOTH").contains(type),"Refeição inválida.");require(servings!=null&&servings.signum()>0&&servings.compareTo(BigDecimal.valueOf(100))<=0,"Porções inválidas.");
        for(String slot:type.equals("BOTH")?List.of("LUNCH","DINNER"):List.of(type)){
            Meal meal=menu.meals.stream().filter(m->m.day.equals(day)&&m.type.equals(slot)).findFirst().orElse(null);if(meal==null){meal=new Meal();meal.day=day;meal.type=slot;menu.meals.add(meal);}meal.recipeId=recipeId;meal.servings=servings;
        }
        menu.updatedAt=Instant.now();audit(a,"MEAL_CHANGED",menu.id,"Refeições de "+day+" guardadas");return menu;
    }
    ShoppingList createList(Account a,String name,LocalDate start,UUID menuId) {
        require(name!=null&&!name.isBlank()&&name.length()<=150,"Indique um nome até 150 caracteres.");
        ShoppingList list=new ShoppingList();list.familyId=a.familyId;list.name=name;list.startDate=start;list.endDate=start==null?null:start.plusDays(6);list.menuId=menuId;
        if(menuId!=null) {Menu menu=owned(Menu.class,menuId,a.familyId);list.startDate=menu.weekStart;list.endDate=menu.weekStart.plusDays(6);list.items=ShoppingCalculator.calculate(menu,id->recipe(id,a.familyId));}
        db.save(list);audit(a,"LIST_CREATED",list.id,name);return list;
    }
    public record ItemInput(String name,String category,BigDecimal quantity,String unit,Boolean purchased,Integer position,long version) {}
    static final Set<String> UNITS=Set.of("g","kg","ml","l","un","colher sopa","colher chá","q.b.");
    static final Set<String> CATEGORIES=Set.of("Frutas","Legumes e verduras","Carnes","Peixe","Laticínios","Mercearia","Congelados","Padaria","Bebidas","Higiene","Limpeza","Outros");
    void itemValues(Item item,ItemInput input) {
        require(input.name()!=null&&!input.name().isBlank()&&input.name().length()<=150,"Nome do produto inválido.");
        require(input.quantity()!=null&&input.quantity().signum()>0&&input.quantity().compareTo(BigDecimal.valueOf(1000000))<=0,"Quantidade inválida.");require(input.unit()!=null&&UNITS.contains(input.unit()),"Unidade inválida.");require(input.category()!=null&&CATEGORIES.contains(input.category()),"Categoria inválida.");
        item.name=input.name().trim();item.category=input.category();item.quantity=input.quantity();item.unit=input.unit();if(input.position()!=null)item.position=input.position();
    }
    Item editItem(Account a,UUID listId,UUID id,ItemInput input) {
        ShoppingList list=owned(ShoppingList.class,listId,a.familyId);db.lock(list);
        Item item=id==null?new Item():list.items.stream().filter(i->i.id.equals(id)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean wasPurchased=item.purchased;BigDecimal oldQuantity=item.quantity;
        if(id!=null) {version(item,input.version());if(!Objects.equals(item.name,input.name())||!Objects.equals(item.unit,input.unit())||input.quantity()==null||item.quantity.compareTo(input.quantity())!=0)item.sourceType="MANUAL";}
        itemValues(item,input);
        item.productId=products.resolve(a.familyId,item.name,item.category,item.unit).id;
        if(input.purchased()!=null&&input.purchased()!=item.purchased){item.purchased=input.purchased();item.purchasedBy=item.purchased?a.id:null;item.purchasedAt=item.purchased?Instant.now():null;}
        if(id==null)list.items.add(item);list.updatedAt=Instant.now();
        String event=id==null?"ITEM_ADDED":wasPurchased!=item.purchased?(item.purchased?"ITEM_PURCHASED":"ITEM_UNPURCHASED"):oldQuantity.compareTo(item.quantity)!=0?"ITEM_QUANTITY_CHANGED":"ITEM_UPDATED";
        String summary=switch(event){case "ITEM_ADDED"->" adicionado";case "ITEM_PURCHASED"->" comprado";case "ITEM_UNPURCHASED"->" desmarcado";case "ITEM_QUANTITY_CHANGED"->" · quantidade alterada";default->" atualizado";};
        audit(a,event,item.id,item.name+summary);return item;
    }
    void removeItem(Account a,UUID listId,UUID itemId,long expected) {
        ShoppingList list=owned(ShoppingList.class,listId,a.familyId);db.lock(list);Item item=list.items.stream().filter(i->i.id.equals(itemId)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));version(item,expected);list.items.remove(item);list.updatedAt=Instant.now();audit(a,"ITEM_REMOVED",item.id,item.name);
    }
    String fingerprint(ShoppingList list,Menu menu) {
        String data=list.id+":"+list.version+":"+list.updatedAt+":"+menu.version+":"+menu.updatedAt+":"+list.items.stream().map(i->i.id+":"+i.version).sorted().toList();
        // Recipe edits also invalidate a previously displayed preview.
        data+=menu.meals.stream().map(m->{Recipe r=recipe(m.recipeId,list.familyId);return r.id+":"+r.version;}).sorted().toList();
        return UUID.nameUUIDFromBytes(data.getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
    }
    Map<String,Object> preview(Account a,UUID id) {
        ShoppingList list=owned(ShoppingList.class,id,a.familyId);require(list.menuId!=null,"Esta lista não está associada a um menu.");Menu menu=owned(Menu.class,list.menuId,a.familyId);
        return Map.of("token",fingerprint(list,menu),"changes",ShoppingCalculator.preview(list.items,ShoppingCalculator.calculate(menu,r->recipe(r,a.familyId))));
    }
    ShoppingList sync(Account a,UUID id,String token) {
        ShoppingList list=owned(ShoppingList.class,id,a.familyId);db.lock(list);require(list.menuId!=null,"Lista sem menu.");Menu menu=owned(Menu.class,list.menuId,a.familyId);db.lock(menu);
        if(!fingerprint(list,menu).equals(token))throw new ResponseStatusException(HttpStatus.CONFLICT,"O menu ou a lista mudou. Consulte uma nova pré-visualização.");
        ShoppingCalculator.apply(list,ShoppingCalculator.calculate(menu,r->recipe(r,a.familyId)));list.updatedAt=Instant.now();audit(a,"LIST_SYNCED",list.id,"Lista atualizada a partir do menu");return list;
    }
}
