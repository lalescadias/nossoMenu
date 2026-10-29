package pt.nossomenu;

import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class Security {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean org.springframework.security.core.userdetails.UserDetailsService users(Store db) { return email->{var account=db.byEmail(email);if(account==null)throw new org.springframework.security.core.userdetails.UsernameNotFoundException("Conta não encontrada");return org.springframework.security.core.userdetails.User.withUsername(account.id.toString()).password(account.passwordHash).authorities("USER").build();}; }
    @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a.requestMatchers("/api/auth/csrf","/api/auth/register","/api/auth/login","/api/auth/forgot-password","/api/auth/reset-password","/error").permitAll().anyRequest().authenticated())
            .csrf(c -> c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .exceptionHandling(e -> e.authenticationEntryPoint((req,res,ex)->res.sendError(401)).accessDeniedHandler((req,res,ex)->res.sendError(403)))
            .logout(l -> l.logoutUrl("/api/auth/logout").invalidateHttpSession(true).deleteCookies("JSESSIONID").logoutSuccessHandler((req,res,a)->res.setStatus(204)))
            .build();
    }
}
