package pt.nossomenu;

import org.springframework.stereotype.Service;
import java.util.*;
import static pt.nossomenu.Model.*;

@Service
public class Products {
    final Store db;
    Products(Store db){this.db=db;}
    static final Map<String,String> ALIASES=Map.ofEntries(Map.entry("cebolas","cebola"),Map.entry("batatas","batata"),Map.entry("ovos","ovos"),Map.entry("ovo","ovos"),Map.entry("tomates","tomate"),Map.entry("cenouras","cenoura"),Map.entry("natas para cozinhar","natas"),Map.entry("creme de leite","natas"),Map.entry("abobrinha","curgete"),Map.entry("alho frances","alho-frances"));
    Product resolve(UUID family,String name,String category,String unit){
        String normalized=ShoppingCalculator.normalize(name);normalized=ALIASES.getOrDefault(normalized,normalized);
        List<Product> candidates=family==null?db.query(Product.class,"where x.familyId is null and x.normalizedName = ?1",normalized):db.query(Product.class,"where (x.familyId is null or x.familyId = ?1) and x.normalizedName = ?2",family,normalized);
        if(!candidates.isEmpty())return candidates.stream().filter(p->p.familyId==null).findFirst().orElse(candidates.getFirst());
        Product p=new Product();p.familyId=family;p.canonicalName=name.trim();p.normalizedName=normalized;p.category=category;p.defaultUnit=unit;return db.save(p);
    }
}
