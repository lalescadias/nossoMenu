package pt.nossomenu;

import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.security.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import static pt.nossomenu.Model.*;
import static pt.nossomenu.MenuService.*;

@RestController @RequestMapping("/api") @Transactional
public class ApiController {
    final MenuService service; final Store db; final Events events;
    ApiController(MenuService service,Store db,Events events){this.service=service;this.db=db;this.events=events;}
    Account user(Principal p){return service.account(p);}
    @GetMapping("/events") SseEmitter events(Principal p){Account a=user(p);return events.connect(a.id,a.familyId);}
    @GetMapping("/families/current") Family family(Principal p){return db.get(Family.class,user(p).familyId);}
    public record Preferences(String name,int adults,int children,BigDecimal childEquivalent,int maxMinutes,boolean repeatDinner,String cuisines,long version) {}
    @PutMapping("/families/current") Family preferences(Principal p,@RequestBody Preferences input){
        Account a=user(p);Family f=db.get(Family.class,a.familyId);db.lock(f);version(f,input.version());
        require(input.name()!=null&&!input.name().isBlank()&&input.name().length()<=100,"Nome inválido.");require(input.adults()>=1&&input.adults()<=20&&input.children()>=0&&input.children()<=20,"Composição familiar inválida.");require(input.childEquivalent()!=null&&input.childEquivalent().signum()>0&&input.childEquivalent().compareTo(BigDecimal.valueOf(2))<=0,"Equivalência infantil inválida.");require(input.maxMinutes()>=5&&input.maxMinutes()<=240,"Tempo inválido.");require(input.cuisines()!=null&&input.cuisines().length()<=100,"Preferências inválidas.");
        f.name=input.name();f.adults=input.adults();f.children=input.children();f.childEquivalent=input.childEquivalent();f.maxMinutes=input.maxMinutes();f.repeatDinner=input.repeatDinner();f.cuisines=input.cuisines();service.audit(a,"PREFERENCES_CHANGED",f.id,"Preferências atualizadas");return f;
    }
    @GetMapping("/families/current/members") List<Map<String,Object>> members(Principal p){return db.family(Account.class,user(p).familyId).stream().map(AuthController::view).toList();}
    @DeleteMapping("/families/current/members/{id}") void removeMember(Principal p,@PathVariable UUID id){
        Account a=user(p);require(a.role.equals("OWNER"),"Apenas o responsável pode remover membros.");Account other=db.get(Account.class,id);require(other.familyId.equals(a.familyId)&&!a.id.equals(id)&&!other.role.equals("OWNER"),"Membro inválido.");
        Family own=new Family();own.name="Família de "+other.name;db.save(own);other.familyId=own.id;other.role="OWNER";events.disconnect(other.id);service.audit(a,"MEMBER_REMOVED",id,other.name+" removido");
    }
    public record InviteInput(String email) {}
    static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    @PostMapping("/families/current/invitations") Map<String,Object> invite(Principal p,@RequestBody InviteInput input){
        Account a=user(p);require(a.role.equals("OWNER"),"Apenas o responsável pode convidar.");require(input.email()!=null&&input.email().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")&&input.email().length()<=254,"Email inválido.");
        byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Invitation invite=new Invitation();invite.familyId=a.familyId;invite.email=input.email().toLowerCase(Locale.ROOT);invite.tokenHash=hash(token);invite.expiresAt=Instant.now().plusSeconds(172800);db.save(invite);service.audit(a,"INVITATION_CREATED",invite.id,"Convite criado");
        return Map.of("token",token,"email",invite.email,"expiresAt",invite.expiresAt);
    }
    public record TokenInput(String token) {}
    @PostMapping("/invitations/accept") Map<String,Object> accept(Principal p,@RequestBody TokenInput input){
        Account a=user(p);require(input.token()!=null,"Convite inválido.");Invitation invite=db.query(Invitation.class,"where x.tokenHash = ?1",hash(input.token())).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Convite inválido."));db.lock(invite);
        require(!invite.used&&invite.expiresAt.isAfter(Instant.now())&&invite.email.equals(a.email),"Convite expirado ou destinado a outra conta.");
        require(db.family(Account.class,a.familyId).size()==1&&db.family(Menu.class,a.familyId).isEmpty()&&db.family(ShoppingList.class,a.familyId).isEmpty()&&db.family(Recipe.class,a.familyId).isEmpty(),"Para aceitar, a sua família atual deve estar vazia e sem outros membros.");
        events.disconnect(a.id);a.familyId=invite.familyId;a.role="MEMBER";invite.used=true;service.audit(a,"MEMBER_JOINED",a.id,a.name+" entrou na família");return AuthController.view(a);
    }
    @GetMapping("/recipes") List<Map<String,Object>> recipes(Principal p,@RequestParam(defaultValue="") String search,@RequestParam(defaultValue="") String category,@RequestParam(required=false) Integer maxMinutes,@RequestParam(defaultValue="false") boolean favorites,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="100") int size){
        require(page>=0&&size>=1&&size<=100,"Página ou tamanho inválido.");
        Account a=user(p);Set<UUID> fav=new HashSet<>();db.family(FavoriteRecipe.class,a.familyId).forEach(f->fav.add(f.recipeId));
        return service.recipes(a.familyId).stream().filter(r->ShoppingCalculator.normalize(r.name).contains(ShoppingCalculator.normalize(search))).filter(r->category.isBlank()||r.category.equals(category)).filter(r->maxMinutes==null||r.prepMinutes+r.cookMinutes<=maxMinutes).filter(r->!favorites||fav.contains(r.id)).skip((long)page*size).limit(size).map(r->recipeView(r,fav.contains(r.id))).toList();
    }
    Map<String,Object> recipeView(Recipe r,boolean favorite){return Map.of("recipe",r,"favorite",favorite,"origin",r.familyId==null?"CATALOG":"FAMILY");}
    @GetMapping("/recipes/{id}") Recipe recipe(Principal p,@PathVariable UUID id){return service.recipe(id,user(p).familyId);}
    public record IngredientInput(String name,String category,BigDecimal quantity,String unit) {}
    public record RecipeInput(String name,String description,String category,String cuisine,int prepMinutes,int cookMinutes,BigDecimal servings,boolean sideDish,String instructions,List<IngredientInput> ingredients,long version) {}
    @PostMapping("/recipes") Recipe createRecipe(Principal p,@RequestBody RecipeInput input){Account a=user(p);Recipe r=new Recipe();r.familyId=a.familyId;fillRecipe(r,input);db.save(r);service.audit(a,"RECIPE_CREATED",r.id,r.name);return r;}
    @PutMapping("/recipes/{id}") Recipe editRecipe(Principal p,@PathVariable UUID id,@RequestBody RecipeInput input){Account a=user(p);Recipe r=service.owned(Recipe.class,id,a.familyId);db.lock(r);version(r,input.version());fillRecipe(r,input);service.audit(a,"RECIPE_CHANGED",id,r.name);return r;}
    void fillRecipe(Recipe r,RecipeInput i){
        require(i.name()!=null&&!i.name().isBlank()&&i.name().length()<=150,"Nome inválido.");require(i.category()!=null&&i.category().length()<=100&&i.cuisine()!=null&&i.cuisine().length()<=100,"Categoria e cozinha obrigatórias.");require(i.prepMinutes()>=0&&i.cookMinutes()>=0&&i.prepMinutes()+i.cookMinutes()>0&&i.prepMinutes()+i.cookMinutes()<=1440,"Tempo inválido.");require(i.servings()!=null&&i.servings().signum()>0&&i.servings().compareTo(BigDecimal.valueOf(100))<=0,"Porções inválidas.");require(i.instructions()!=null&&!i.instructions().isBlank()&&i.instructions().length()<=10000,"Indique a preparação.");require(i.ingredients()!=null&&!i.ingredients().isEmpty()&&i.ingredients().size()<=100,"Indique entre 1 e 100 ingredientes.");
        r.name=i.name();r.description=i.description();r.category=i.category();r.cuisine=i.cuisine();r.prepMinutes=i.prepMinutes();r.cookMinutes=i.cookMinutes();r.servings=i.servings();r.sideDish=i.sideDish();r.instructions=i.instructions();r.ingredients.clear();
        for(var ingredient:i.ingredients()){Item validation=new Item();service.itemValues(validation,new ItemInput(ingredient.name(),ingredient.category(),ingredient.quantity(),ingredient.unit(),false,null,0));Ingredient entry=new Ingredient();entry.name=validation.name;entry.category=validation.category;entry.quantity=validation.quantity;entry.unit=validation.unit;entry.productId=service.products.resolve(r.familyId,entry.name,entry.category,entry.unit).id;r.ingredients.add(entry);}
    }
    @DeleteMapping("/recipes/{id}") void deleteRecipe(Principal p,@PathVariable UUID id,@RequestParam long version){Account a=user(p);Recipe r=service.owned(Recipe.class,id,a.familyId);MenuService.version(r,version);boolean used=db.family(Menu.class,a.familyId).stream().flatMap(m->m.meals.stream()).anyMatch(m->m.recipeId.equals(id));require(!used,"Esta receita está num menu guardado. Remova as refeições antes de eliminar.");db.family(FavoriteRecipe.class,a.familyId).stream().filter(f->f.recipeId.equals(id)).forEach(db::remove);db.remove(r);service.audit(a,"RECIPE_REMOVED",id,r.name);}
    @PostMapping("/recipes/{id}/favorite") void favorite(Principal p,@PathVariable UUID id){Account a=user(p);service.recipe(id,a.familyId);if(db.family(FavoriteRecipe.class,a.familyId).stream().noneMatch(f->f.recipeId.equals(id))){FavoriteRecipe f=new FavoriteRecipe();f.familyId=a.familyId;f.recipeId=id;db.save(f);service.audit(a,"FAVORITE_CHANGED",id,"Receita favorita");}}
    @DeleteMapping("/recipes/{id}/favorite") void unfavorite(Principal p,@PathVariable UUID id){Account a=user(p);db.family(FavoriteRecipe.class,a.familyId).stream().filter(f->f.recipeId.equals(id)).forEach(db::remove);service.audit(a,"FAVORITE_CHANGED",id,"Favorito removido");}
    @GetMapping("/meal-suggestions") List<Recipe> suggestions(Principal p,@RequestParam(defaultValue="3") int count,@RequestParam(defaultValue="0") int offset,@RequestParam(required=false) Integer maxMinutes,@RequestParam(required=false) String category){return service.suggestions(user(p),Math.min(Math.max(count,1),100),offset,maxMinutes,category);}
    @GetMapping("/meal-suggestions/random") List<Recipe> random(Principal p,@RequestParam(required=false) Integer maxMinutes,@RequestParam(required=false) String category){return service.suggestions(user(p),1,new SecureRandom().nextInt(10000),maxMinutes,category);}
    @GetMapping("/menus") List<Menu> menus(Principal p,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="100") int size){return db.familyPage(Menu.class,user(p).familyId,page,size);}
    @PostMapping("/menus") Menu emptyMenu(Principal p,@RequestBody GenerateInput input){Account a=user(p);require(input.weekStart()!=null,"Indique a semana.");LocalDate start=input.weekStart().with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));Menu menu=db.query(Menu.class,"where x.familyId = ?1 and x.weekStart = ?2",a.familyId,start).stream().findFirst().orElse(null);if(menu!=null)return menu;menu=new Menu();menu.familyId=a.familyId;menu.weekStart=start;db.save(menu);service.audit(a,"MENU_CREATED",menu.id,"Semana criada");return menu;}
    @GetMapping("/menus/{id}") Menu menu(Principal p,@PathVariable UUID id){return service.owned(Menu.class,id,user(p).familyId);}
    public record GenerateInput(LocalDate weekStart,boolean replace,Long version) {}
    @PostMapping("/menus/generate") Menu generate(Principal p,@RequestBody GenerateInput input){require(input.weekStart()!=null,"Indique a semana.");return service.generate(user(p),input.weekStart(),input.replace(),input.version());}
    public record MealInput(UUID recipeId,BigDecimal servings,long version,LocalDate day,String type) {}
    @PutMapping("/menus/{id}/day") Menu day(Principal p,@PathVariable UUID id,@RequestBody MealInput input){return service.setDay(user(p),id,input.day(),input.type(),input.recipeId(),input.servings(),input.version());}
    @PutMapping("/menus/{id}/meals/{mealId}") void meal(Principal p,@PathVariable UUID id,@PathVariable UUID mealId,@RequestBody MealInput input){service.changeMeal(user(p),id,mealId,input.recipeId(),input.servings(),input.version(),false);}
    @PostMapping("/menus/{id}/meals") Meal addMeal(Principal p,@PathVariable UUID id,@RequestBody MealInput input){return service.addMeal(user(p),id,input.day(),input.type(),input.recipeId(),input.servings(),input.version());}
    @DeleteMapping("/menus/{id}/meals/{mealId}") void removeMeal(Principal p,@PathVariable UUID id,@PathVariable UUID mealId,@RequestParam long version){service.changeMeal(user(p),id,mealId,null,null,version,true);}
    @GetMapping("/shopping-lists") List<ShoppingList> lists(Principal p,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="100") int size){return db.familyPage(ShoppingList.class,user(p).familyId,page,size);}
    @GetMapping("/shopping-lists/{id}") ShoppingList list(Principal p,@PathVariable UUID id){return service.owned(ShoppingList.class,id,user(p).familyId);}
    public record ListInput(String name,LocalDate startDate,UUID menuId) {}
    @PostMapping({"/shopping-lists","/shopping-lists/from-menu"}) ShoppingList createList(Principal p,@RequestBody ListInput input){return service.createList(user(p),input.name(),input.startDate(),input.menuId());}
    @PostMapping("/shopping-lists/{id}/duplicate") ShoppingList duplicate(Principal p,@PathVariable UUID id){Account a=user(p);ShoppingList old=service.owned(ShoppingList.class,id,a.familyId);ShoppingList copy=service.createList(a,old.name.substring(0,Math.min(140,old.name.length()))+" (cópia)",LocalDate.now(),null);for(Item item:old.items){Item next=new Item();next.productId=item.productId;next.name=item.name;next.category=item.category;next.quantity=item.quantity;next.unit=item.unit;next.position=item.position;copy.items.add(next);}return copy;}
    public record ListStatus(String status,long version) {}
    @PatchMapping("/shopping-lists/{id}") ShoppingList status(Principal p,@PathVariable UUID id,@RequestBody ListStatus input){Account a=user(p);ShoppingList list=service.owned(ShoppingList.class,id,a.familyId);db.lock(list);version(list,input.version());require(Set.of("ACTIVE","COMPLETED","ARCHIVED").contains(input.status()),"Estado inválido.");list.status=input.status();service.audit(a,"LIST_STATUS_CHANGED",id,input.status());return list;}
    @PostMapping("/shopping-lists/{id}/preview-sync") Map<String,Object> preview(Principal p,@PathVariable UUID id){return service.preview(user(p),id);}
    @PostMapping("/shopping-lists/{id}/apply-sync") ShoppingList sync(Principal p,@PathVariable UUID id,@RequestBody TokenInput input){return service.sync(user(p),id,input.token());}
    @PostMapping("/shopping-lists/{id}/items") Item addItem(Principal p,@PathVariable UUID id,@RequestBody ItemInput input){return service.editItem(user(p),id,null,input);}
    @PatchMapping("/shopping-lists/{id}/items/{itemId}") Item editItem(Principal p,@PathVariable UUID id,@PathVariable UUID itemId,@RequestBody ItemInput input){return service.editItem(user(p),id,itemId,input);}
    @DeleteMapping("/shopping-lists/{id}/items/{itemId}") void deleteItem(Principal p,@PathVariable UUID id,@PathVariable UUID itemId,@RequestParam long version){service.removeItem(user(p),id,itemId,version);}
    @GetMapping("/favorite-products") List<FavoriteProduct> products(Principal p,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="100") int size){return db.familyPage(FavoriteProduct.class,user(p).familyId,page,size);}
    @PostMapping("/favorite-products") FavoriteProduct favoriteProduct(Principal p,@RequestBody ItemInput input){Account a=user(p);Item validated=new Item();service.itemValues(validated,input);Product product=service.products.resolve(a.familyId,validated.name,validated.category,validated.unit);FavoriteProduct existing=db.family(FavoriteProduct.class,a.familyId).stream().filter(f->product.id.equals(f.productId)&&f.unit.equals(validated.unit)).findFirst().orElse(null);if(existing!=null)return existing;FavoriteProduct f=new FavoriteProduct();f.familyId=a.familyId;f.productId=product.id;f.name=validated.name;f.category=validated.category;f.quantity=validated.quantity;f.unit=validated.unit;db.save(f);service.audit(a,"PRODUCT_FAVORITE_ADDED",f.id,f.name);return f;}
    @DeleteMapping("/favorite-products/{id}") void deleteFavorite(Principal p,@PathVariable UUID id){Account a=user(p);db.remove(service.owned(FavoriteProduct.class,id,a.familyId));service.audit(a,"PRODUCT_FAVORITE_REMOVED",id,"Favorito removido");}
    @GetMapping("/products/most-purchased") List<Map<String,Object>> frequent(Principal p){
        Map<String,List<Item>> groups=new HashMap<>();db.family(ShoppingList.class,user(p).familyId).stream().flatMap(l->l.items.stream()).filter(i->i.purchased).forEach(i->groups.computeIfAbsent(ShoppingCalculator.key(i),k->new ArrayList<>()).add(i));
        return groups.values().stream().sorted(Comparator.<List<Item>>comparingInt(List::size).reversed()).limit(30).map(items->{Item i=items.getFirst();return Map.<String,Object>of("name",i.name,"category",i.category,"quantity",i.quantity,"unit",i.unit,"frequency",items.size(),"lastPurchasedAt",items.stream().map(x->x.purchasedAt).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(Instant.EPOCH));}).toList();
    }
    @GetMapping("/activity") List<Activity> activity(Principal p,@RequestParam(defaultValue="0") int page){return db.familyPage(Activity.class,user(p).familyId,page,50);}
}
