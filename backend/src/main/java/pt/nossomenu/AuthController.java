package pt.nossomenu;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
import static pt.nossomenu.Model.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    final Store store; final PasswordEncoder passwords;
    AuthController(Store store,PasswordEncoder passwords) { this.store=store; this.passwords=passwords; }
    public record Credentials(@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(min=10,max=72) String password,String name,String familyName) {}
    @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken()); }
    @PostMapping("/register") @Transactional
    public Map<String,Object> register(@Valid @RequestBody Credentials c,HttpServletRequest req,HttpServletResponse res) {
        MenuService.require(c.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length<=72,"A palavra-passe deve ter até 72 bytes.");
        if(c.name()==null || c.name().isBlank() || c.name().length()>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Indique o seu nome (até 100 caracteres).");
        if(store.byEmail(c.email())!=null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Não foi possível criar esta conta.");
        Family family=new Family(); family.name=c.familyName()==null || c.familyName().isBlank()?"A nossa família":c.familyName().substring(0,Math.min(100,c.familyName().length())); store.save(family);
        Account a=new Account(); a.email=c.email().toLowerCase(Locale.ROOT); a.name=c.name(); a.passwordHash=passwords.encode(c.password()); a.familyId=family.id; store.save(a);
        loginSession(a,req,res); return view(a);
    }
    @PostMapping("/login") @Transactional(readOnly=true)
    public Map<String,Object> login(@Valid @RequestBody Credentials c,HttpServletRequest req,HttpServletResponse res) {
        MenuService.require(c.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length<=72,"A palavra-passe deve ter até 72 bytes.");
        Account a=store.byEmail(c.email());
        if(a==null || !passwords.matches(c.password(),a.passwordHash)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Email ou palavra-passe incorretos.");
        loginSession(a,req,res); return view(a);
    }
    void loginSession(Account a,HttpServletRequest req,HttpServletResponse res) {
        if(req.getSession(false)!=null) req.changeSessionId();
        var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(a.id.toString(),null,List.of()));
        SecurityContextHolder.setContext(context);
        new HttpSessionSecurityContextRepository().saveContext(context,req,res);
        req.getSession().setAttribute("passwordRevision",a.passwordRevision);
    }
    static Map<String,Object> view(Account a) { return Map.of("id",a.id,"name",a.name,"email",a.email,"familyId",a.familyId,"role",a.role); }
    @GetMapping("/me") @Transactional(readOnly=true) public Map<String,Object> me(java.security.Principal p) { return view(store.get(Account.class,UUID.fromString(p.getName()))); }
    @PostMapping("/renew") @Transactional(readOnly=true) public Map<String,Object> renew(java.security.Principal p,HttpServletRequest request){request.changeSessionId();return view(store.get(Account.class,UUID.fromString(p.getName())));}
}
