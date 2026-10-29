package pt.nossomenu;

import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import static pt.nossomenu.Model.*;
import static pt.nossomenu.MenuService.require;

@RestController @RequestMapping("/api/auth") @Transactional
public class RecoveryController {
    final Store db;final PasswordEncoder passwords;final ObjectProvider<JavaMailSender> mail;final Events events;final String from;
    RecoveryController(Store db,PasswordEncoder passwords,ObjectProvider<JavaMailSender> mail,Events events,@Value("${app.mail-from:}") String from){this.db=db;this.passwords=passwords;this.mail=mail;this.events=events;this.from=from;}
    public record Forgot(String email) {}
    public record Reset(String token,String password) {}
    @PostMapping("/forgot-password") Map<String,String> forgot(@RequestBody Forgot input){
        require(input.email()!=null&&input.email().length()<=254,"Email inválido.");
        JavaMailSender sender=mail.getIfAvailable();if(sender==null||from.isBlank())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"A recuperação por email ainda não está configurada. Contacte o responsável pela aplicação.");
        Account account=db.byEmail(input.email());
        if(account!=null){byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);PasswordReset reset=new PasswordReset();reset.accountId=account.id;reset.tokenHash=ApiController.hash(token);reset.expiresAt=Instant.now().plusSeconds(1800);db.save(reset);
            SimpleMailMessage message=new SimpleMailMessage();message.setFrom(from);message.setTo(account.email);message.setSubject("Nosso Menu · Recuperar acesso");message.setText("Foi pedida uma nova palavra-passe para a sua conta Nosso Menu.\n\nCódigo (válido por 30 minutos):\n"+token+"\n\nNa aplicação, escolha Recuperar acesso e introduza este código. Se não fez este pedido, ignore esta mensagem.");sender.send(message);
        }
        return Map.of("message","Se o email estiver registado, receberá um código de recuperação.");
    }
    @PostMapping("/reset-password") void reset(@RequestBody Reset input){
        require(input.token()!=null&&input.password()!=null&&input.password().length()>=10&&input.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length<=72,"Palavra-passe inválida (mínimo 10 caracteres, máximo 72 bytes).");
        PasswordReset token=db.query(PasswordReset.class,"where x.tokenHash = ?1",ApiController.hash(input.token())).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Código inválido."));db.lock(token);require(!token.used&&token.expiresAt.isAfter(Instant.now()),"Código inválido ou expirado.");
        Account account=db.get(Account.class,token.accountId);db.lock(account);account.passwordHash=passwords.encode(input.password());account.passwordRevision++;token.used=true;
        db.query(PasswordReset.class,"where x.accountId = ?1",account.id).forEach(t->t.used=true);events.disconnect(account.id);
    }
}
