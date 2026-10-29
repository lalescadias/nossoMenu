package pt.nossomenu;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.core.annotation.Order;
import java.io.IOException;
import java.util.*;
import static pt.nossomenu.Model.*;

/** Invalidates all earlier sessions after a password reset, including on other devices. */
@Component @Order(0)
public class SessionGuard extends OncePerRequestFilter {
    final Store db;
    SessionGuard(Store db){this.db=db;}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws IOException,ServletException {
        var authentication=SecurityContextHolder.getContext().getAuthentication();var session=request.getSession(false);
        if(authentication!=null&&session!=null&&authentication.getName().matches("[a-f0-9-]{36}")){
            Account a=db.get(Account.class,UUID.fromString(authentication.getName()));Object revision=session.getAttribute("passwordRevision");
            if(!(revision instanceof Long value)||value!=a.passwordRevision){session.invalidate();SecurityContextHolder.clearContext();response.sendError(401);return;}
        }
        chain.doFilter(request,response);
    }
}
