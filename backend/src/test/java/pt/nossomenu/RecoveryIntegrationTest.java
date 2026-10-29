package pt.nossomenu;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties="app.mail-from=noreply@example.invalid") @ActiveProfiles("test")
class RecoveryIntegrationTest {
    @Autowired WebApplicationContext context;
    static final AtomicReference<SimpleMailMessage> sent=new AtomicReference<>();
    @TestConfiguration static class MailConfig {
        @Bean JavaMailSender sender(){return new JavaMailSenderImpl(){@Override public void send(SimpleMailMessage message){sent.set(message);}};}
    }
    @Test void resetCodesAreSingleUseAndChangeThePasswordWithoutSendingRealMail() throws Exception {
        var mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content("{\"name\":\"Recovery\",\"email\":\"recovery@example.invalid\",\"password\":\"original-password-123\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/auth/forgot-password").with(csrf()).contentType("application/json").content("{\"email\":\"recovery@example.invalid\"}")).andExpect(status().isOk());
        String text=sent.get().getText();assertThat(text).isNotNull();String token=text.substring(text.indexOf("minutos):\n")+10).split("\n")[0];assertThat(token).hasSize(43);
        String reset="{\"token\":\""+token+"\",\"password\":\"new-password-long-456\"}";
        mvc.perform(post("/api/auth/reset-password").with(csrf()).contentType("application/json").content(reset)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/reset-password").with(csrf()).contentType("application/json").content(reset)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"recovery@example.invalid\",\"password\":\"original-password-123\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"recovery@example.invalid\",\"password\":\"new-password-long-456\"}")).andExpect(status().isOk());
    }
}
