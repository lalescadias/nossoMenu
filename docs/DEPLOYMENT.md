# Publicação e operação

## Produção com Docker Compose e HTTPS

O caminho preparado é um servidor com Docker e um domínio apontado para esse servidor. As portas 80 e 443 precisam de estar acessíveis. Edite `.env` com `APP_DOMAIN`, uma palavra-passe forte da base de dados e, se pretender recuperação de acesso, os dados SMTP.

```sh
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

Caddy obtém e renova o certificado HTTPS. O frontend e a API usam a mesma origem; não é necessário abrir CORS. O perfil production usa cookies Secure, um pool pequeno de ligações e SMTP com STARTTLS. A base de dados só publica a porta no loopback e o backend só fica disponível na rede Docker. Em infraestrutura gerida, use PostgreSQL externo com TLS (`sslmode=require`) e configure DATABASE_URL, DATABASE_USER e DATABASE_PASSWORD no serviço Java.

Os dados SMTP são segredos de ambiente, nunca valores para o repositório. Sem SMTP e MAIL_FROM, a recuperação de acesso informa que está indisponível. Para ativar em desenvolvimento, defina `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` e `MAIL_FROM` no ambiente do backend. Não foi enviado email real nesta implementação.

O frontend Nginx confia apenas no backend de rede Docker. Não publique a porta Java diretamente sem um proxy HTTPS. O endereço X-Forwarded-Proto deve refletir HTTPS quando houver proxies adicionais; reveja essa configuração ao adaptar a infraestrutura.

## Opções com custo inicial reduzido

Estas condições foram consultadas em 29 de outubro de 2026; confirme os limites antes de contratar. Não há garantia de gratuidade permanente.

| Opção | Utilização e limitações |
|---|---|
| Servidor/VPS com Compose | Executa os três serviços e Caddy no mesmo domínio; exige pagar o servidor e gerir atualizações, disco e backups. Sem dependência de filesystem temporário. |
| Render Docker + PostgreSQL externo | Pode executar o backend Java; o plano gratuito suspende após 15 minutos de inatividade e o arranque seguinte pode demorar cerca de um minuto. Tem limites mensais e filesystem efémero. SMTP 25/465/587 é bloqueado no plano gratuito; a recuperação implementada por SMTP exige outro ambiente ou uma futura adaptação a email HTTP. A base gratuita do Render expira em 30 dias: não é adequada à persistência familiar permanente. [Documentação Render](https://render.com/docs/free). |
| Neon PostgreSQL | Compatível por JDBC/TLS. O plano Free tem quotas de armazenamento, compute e transferência; suspende compute ao esgotar quotas e escala a zero com inatividade. A tabela de limites consultada indica 1 GB por projeto, 100 CU-h/mês e 5 GB de transferência; os limites podem mudar. [Limites oficiais](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md). |
| Cloudflare Pages para o frontend | Só aloja o build estático React; não executa Java. É necessário alojar o backend separadamente e encaminhar `/api` na mesma origem através de um proxy adequado. Não publicar apenas o frontend esperando que as funcionalidades persistentes funcionem. |

O alojamento Sites/Workers também não executa o backend Spring Boot. Não foi criado um Site que substitua o backend por armazenamento local.

## Migrações

Flyway executa as migrações versionadas antes de iniciar a aplicação; Hibernate valida o esquema sem o recriar. Faça backup antes de atualizar. Não altere migrações já aplicadas: acrescente outra versão. O seed do catálogo executa numa transação quando ainda não existem receitas globais.

## Backups e recuperação

Use backups nativos do fornecedor ou `pg_dump` diário, com retenção definida e cópia fora do servidor. O volume Docker persistente **não substitui backup**.

```sh
mkdir -p backups
docker compose exec -T db pg_dump -U nossomenu -d nossomenu -Fc -f /tmp/nossomenu.dump
docker compose cp db:/tmp/nossomenu.dump ./backups/nossomenu.dump
```

O `.dump` pode conter dados pessoais: guarde-o cifrado, limite acesso e nunca o comite. Para ensaiar recuperação, use **uma base vazia separada** e `pg_restore --no-owner -d <base_teste> <dump>`. Não restaure por cima da base de produção. Verifique contagens, contas, menus e itens comprados após o ensaio.

## Logs e manutenção

`docker compose logs --tail 100 backend` mostra migrações, arranque e erros. Não ative logs de corpos HTTP em produção: podem conter palavras-passe, emails ou códigos. O frontend apresenta erros de ligação e não confirma gravações falhadas. Os logs de atividade familiares ficam na base.

A instância atual usa sessões e SSE em memória, adequada a uma única réplica. Reinícios exigem novo login, mas não apagam menus ou compras. Escalar para várias réplicas requer sessões partilhadas e um canal de eventos comum. A limitação de tentativas é por IP e por processo; um proxy partilhado pode agrupar utilizadores. Para uma publicação maior, use também limites no proxy e revisão de segurança independente.
