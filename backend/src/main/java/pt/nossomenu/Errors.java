package pt.nossomenu;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.*;
import jakarta.persistence.OptimisticLockException;
import java.util.Map;

@RestControllerAdvice
public class Errors {
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> status(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Pedido inválido.":e.getReason())); }
    @ExceptionHandler({MethodArgumentNotValidException.class,IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class}) ResponseEntity<?> invalid(Exception e) { return ResponseEntity.badRequest().body(Map.of("message","Verifique os campos e as quantidades introduzidas.")); }
    @ExceptionHandler({OptimisticLockException.class,OptimisticLockingFailureException.class,DataIntegrityViolationException.class}) ResponseEntity<?> conflict(Exception e) { return ResponseEntity.status(409).body(Map.of("message","Os dados foram alterados por outra pessoa. Atualize a página e tente novamente.")); }
}
