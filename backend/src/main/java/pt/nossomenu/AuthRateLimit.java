package pt.nossomenu;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.concurrent.*;

@Component @Order(-101)
public class AuthRateLimit extends OncePerRequestFilter {
    record Bucket(long window,int attempts) {}
    final ConcurrentHashMap<String,Bucket> attempts=new ConcurrentHashMap<>();
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws IOException,ServletException {
        if(req.getMethod().equals("POST")&&req.getRequestURI().startsWith("/api/auth/")&&!req.getRequestURI().endsWith("/logout")&&!req.getRequestURI().endsWith("/renew")){
            long window=System.currentTimeMillis()/60000;String key=req.getRemoteAddr();
            if(attempts.size()>10000)attempts.entrySet().removeIf(e->e.getValue().window<window);
            Bucket bucket=attempts.compute(key,(k,old)->new Bucket(window,old==null||old.window!=window?1:old.attempts+1));
            if(bucket.attempts>20){res.setStatus(429);res.setHeader("Retry-After","60");res.setContentType("application/json");res.getWriter().write("{\"message\":\"Demasiadas tentativas. Aguarde um minuto.\"}");return;}
        }
        chain.doFilter(req,res);
    }
}
