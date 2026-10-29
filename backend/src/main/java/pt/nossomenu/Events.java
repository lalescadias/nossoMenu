package pt.nossomenu;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.scheduling.annotation.*;
import org.springframework.transaction.support.*;
import java.util.*;
import java.util.concurrent.*;

@Component @EnableScheduling
public class Events {
    record Subscriber(UUID accountId,UUID familyId,SseEmitter emitter) {}
    final List<Subscriber> clients=new CopyOnWriteArrayList<>();
    SseEmitter connect(UUID account,UUID family) {
        var emitter=new SseEmitter(300000L); var client=new Subscriber(account,family,emitter); clients.add(client);
        emitter.onCompletion(()->clients.remove(client)); emitter.onTimeout(()->clients.remove(client)); emitter.onError(e->clients.remove(client));
        send(client,"connected"); return emitter;
    }
    void send(Subscriber c,String name) { try { c.emitter.send(SseEmitter.event().name(name).data("refresh")); } catch(Exception e) {clients.remove(c); c.emitter.complete();} }
    void changed(UUID family) {
        if(TransactionSynchronizationManager.isSynchronizationActive()) TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){ public void afterCommit(){ publish(family); }});
        else publish(family);
    }
    void publish(UUID family) { clients.stream().filter(c->c.familyId.equals(family)).forEach(c->send(c,"changed")); }
    void disconnect(UUID account) { clients.stream().filter(c->c.accountId.equals(account)).forEach(c->{c.emitter.complete();clients.remove(c);}); }
    @Scheduled(fixedRate=25000) void heartbeat() { clients.forEach(c->send(c,"heartbeat")); }
}
