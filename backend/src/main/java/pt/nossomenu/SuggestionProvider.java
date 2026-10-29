package pt.nossomenu;

import java.util.*;
import static pt.nossomenu.Model.*;

/** A future provider can be substituted without changing menus or the REST contracts. */
public interface SuggestionProvider {
    List<Recipe> rank(List<Recipe> recipes,Family preferences,Set<UUID> favorites,Map<UUID,Integer> recent);
}
