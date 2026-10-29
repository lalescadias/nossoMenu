package pt.nossomenu;

import jakarta.persistence.*;
import org.springframework.stereotype.Repository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static pt.nossomenu.Model.*;

@Repository
public class Store {
    @PersistenceContext EntityManager em;
    public <T> T save(T row) { em.persist(row); return row; }
    public void flush() { em.flush(); }
    public void remove(Object row) { em.remove(row); }
    public <T> T get(Class<T> type, UUID id) {
        T row = em.find(type,id);
        if(row == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Registo não encontrado.");
        return row;
    }
    public <T> List<T> query(Class<T> type,String where,Object... values) {
        var q = em.createQuery("select x from "+type.getSimpleName()+" x "+where,type);
        for(int i=0;i<values.length;i++) q.setParameter(i+1,values[i]);
        return q.getResultList();
    }
    public <T> List<T> family(Class<T> type,UUID family) { return query(type,"where x.familyId = ?1 order by x.createdAt desc",family); }
    public <T> List<T> familyPage(Class<T> type,UUID family,int page,int size) {
        MenuService.require(page>=0&&size>=1&&size<=100,"Página ou tamanho inválido.");
        return em.createQuery("select x from "+type.getSimpleName()+" x where x.familyId = :family order by x.createdAt desc, x.id",type).setParameter("family",family).setFirstResult(Math.multiplyExact(page,size)).setMaxResults(size).getResultList();
    }
    public Account byEmail(String email) { return query(Account.class,"where x.email = ?1",email.toLowerCase(Locale.ROOT)).stream().findFirst().orElse(null); }
    public void lock(Object row) { em.lock(row,LockModeType.PESSIMISTIC_WRITE); em.refresh(row); }
}
