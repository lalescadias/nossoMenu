package pt.nossomenu;

import org.springframework.stereotype.Component;
import java.util.*;
import static pt.nossomenu.Model.*;

@Component
public class RuleBasedSuggestions implements SuggestionProvider {
    @Override public List<Recipe> rank(List<Recipe> recipes,Family family,Set<UUID> favorites,Map<UUID,Integer> recent){
        return recipes.stream().filter(r->!r.sideDish).filter(r->family.cuisines.isBlank()||family.cuisines.contains(r.cuisine))
            .sorted(Comparator.<Recipe>comparingInt(r->(favorites.contains(r.id)?-30:0)+(r.prepMinutes+r.cookMinutes<=family.maxMinutes?-20:0)+recent.getOrDefault(r.id,0)*3).thenComparing(r->r.name)).toList();
    }
}
