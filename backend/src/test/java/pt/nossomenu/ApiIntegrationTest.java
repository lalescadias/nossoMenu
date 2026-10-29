package pt.nossomenu;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.mock.web.MockHttpSession;
import tools.jackson.databind.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @ActiveProfiles("test")
class ApiIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper json;
    MockMvc mvc;
    @BeforeEach void setup(){mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();}
    JsonNode body(MvcResult result) throws Exception {return json.readTree(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));}
    MockHttpSession register(String name) throws Exception {
        var result=mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content("{\"name\":\""+name+"\",\"email\":\""+name+"@example.com\",\"password\":\"a-long-password-123\"}")).andExpect(status().isOk()).andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("password");return (MockHttpSession)result.getRequest().getSession();
    }
    @Test void fullSharedFamilyFlowPersistsAndProtectsShopping() throws Exception {
        var alice=register("alice");var bob=register("bob");var outsider=register("outside");
        mvc.perform(get("/api/recipes")).andExpect(status().isUnauthorized());mvc.perform(post("/api/shopping-lists").session(alice).contentType("application/json").content("{\"name\":\"No csrf\"}")).andExpect(status().isForbidden());
        var invitation=body(mvc.perform(post("/api/families/current/invitations").session(alice).with(csrf()).contentType("application/json").content("{\"email\":\"bob@example.com\"}")).andExpect(status().isOk()).andReturn());
        mvc.perform(post("/api/invitations/accept").session(bob).with(csrf()).contentType("application/json").content("{\"token\":\""+invitation.get("token").asText()+"\"}")).andExpect(status().isOk());
        var menu=body(mvc.perform(post("/api/menus/generate").session(alice).with(csrf()).contentType("application/json").content("{\"weekStart\":\"2026-11-02\"}")).andExpect(status().isOk()).andReturn());assertThat(menu.get("meals").size()).isEqualTo(14);
        var list=body(mvc.perform(post("/api/shopping-lists/from-menu").session(alice).with(csrf()).contentType("application/json").content("{\"name\":\"Compras\",\"menuId\":\""+menu.get("id").asText()+"\"}")).andExpect(status().isOk()).andReturn());String id=list.get("id").asText();
        mvc.perform(get("/api/shopping-lists/"+id).session(outsider)).andExpect(status().isNotFound());mvc.perform(get("/api/shopping-lists/"+id).session(bob)).andExpect(status().isOk());
        var manual=body(mvc.perform(post("/api/shopping-lists/"+id+"/items").session(alice).with(csrf()).contentType("application/json").content("{\"name\":\"Detergente\",\"category\":\"Limpeza\",\"quantity\":2,\"unit\":\"un\"}")).andExpect(status().isOk()).andReturn());
        String itemId=manual.get("id").asText();String update="{\"name\":\"Detergente\",\"category\":\"Limpeza\",\"quantity\":2,\"unit\":\"un\",\"purchased\":true,\"version\":0}";
        mvc.perform(patch("/api/shopping-lists/"+id+"/items/"+itemId).session(bob).with(csrf()).contentType("application/json").content(update)).andExpect(status().isOk());
        mvc.perform(patch("/api/shopping-lists/"+id+"/items/"+itemId).session(alice).with(csrf()).contentType("application/json").content(update)).andExpect(status().isConflict());
        var preview=body(mvc.perform(post("/api/shopping-lists/"+id+"/preview-sync").session(alice).with(csrf())).andExpect(status().isOk()).andReturn());
        mvc.perform(post("/api/shopping-lists/"+id+"/apply-sync").session(alice).with(csrf()).contentType("application/json").content("{\"token\":\""+preview.get("token").asText()+"\"}")).andExpect(status().isOk());
        var saved=body(mvc.perform(get("/api/shopping-lists/"+id).session(bob)).andExpect(status().isOk()).andReturn());boolean found=false;for(JsonNode item:saved.get("items"))if(item.get("id").asText().equals(itemId)){found=true;assertThat(item.get("purchased").asBoolean()).isTrue();assertThat(item.get("purchasedBy").asText()).isNotBlank();}assertThat(found).isTrue();
        mvc.perform(post("/api/shopping-lists/"+id+"/apply-sync").session(alice).with(csrf()).contentType("application/json").content("{\"token\":\""+preview.get("token").asText()+"\"}")).andExpect(status().isConflict());
        var logs=body(mvc.perform(get("/api/activity").session(alice)).andExpect(status().isOk()).andReturn());assertThat(logs.toString()).contains("bob","ITEM_PURCHASED");
    }
    @Test void regenerationRequiresConfirmationAndKeepsOtherWeeks() throws Exception {
        var session=register("planning");String first="{\"weekStart\":\"2026-12-07\"}";
        var menu=body(mvc.perform(post("/api/menus/generate").session(session).with(csrf()).contentType("application/json").content(first)).andExpect(status().isOk()).andReturn());
        mvc.perform(post("/api/menus/generate").session(session).with(csrf()).contentType("application/json").content(first)).andExpect(status().isConflict());
        mvc.perform(post("/api/menus/generate").session(session).with(csrf()).contentType("application/json").content("{\"weekStart\":\"2026-12-14\"}")).andExpect(status().isOk());
        var replaced=body(mvc.perform(post("/api/menus/generate").session(session).with(csrf()).contentType("application/json").content("{\"weekStart\":\"2026-12-07\",\"replace\":true,\"version\":"+menu.get("version").asLong()+"}")).andExpect(status().isOk()).andReturn());
        assertThat(replaced.get("meals").size()).isEqualTo(14);
        var weeks=body(mvc.perform(get("/api/menus?page=0&size=1").session(session)).andExpect(status().isOk()).andReturn());assertThat(weeks.size()).isEqualTo(1);
        weeks=body(mvc.perform(get("/api/menus?page=1&size=1").session(session)).andExpect(status().isOk()).andReturn());assertThat(weeks.size()).isEqualTo(1);
    }
}
