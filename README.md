# Nosso Menu

Planeamento alimentar e compras para uma família. React + TypeScript + Vite, Spring Boot 4.1.2 / Java 21 e PostgreSQL 17.

## Executar

É necessário Docker Desktop em execução. Na raiz do projeto:

```powershell
Copy-Item .env.example .env
# Edite .env e defina DATABASE_PASSWORD com uma palavra-passe aleatória.
docker compose up -d --build
```

Abra **http://localhost:8088** e crie uma conta. Não existem contas de demonstração nem credenciais fixas. O ficheiro `.env` local já foi gerado durante o desenvolvimento; não o substitua se já estiver a usar a base de dados.

O catálogo tem 18 receitas reais com ingredientes, porções de referência e preparação. Os dados da família são criados pelas ações na aplicação. O PostgreSQL usa um volume persistente. `docker compose stop` para os serviços sem apagar dados; `docker compose start` volta a iniciá-los. **Não use `down -v` se quiser conservar os dados.**

## O que está implementado

- Contas individuais, login/logout, rotação de sessão, palavras-passe BCrypt, CSRF e limitação de tentativas.
- Espaço familiar com responsável e membros, convite de uso único (48 horas), aceitação pelo email convidado e remoção de membros.
- Preferências de adultos/crianças, equivalência infantil explícita e editável, tempo preferido, cozinhas e repetição do jantar.
- Catálogo português/brasileiro, pesquisa, filtros, favoritos familiares, receitas próprias, edição e cópia personalizada de receitas globais.
- Semanas anteriores e futuras, geração de 14 refeições, alteração independente de almoço/jantar, três alternativas, seleção manual e remoção.
- Sugestões por regras, sem API de IA. A interface `SuggestionProvider` permite substituir o fornecedor posteriormente.
- Listas manuais e geradas, quantidades por refeição/porções, equivalência de produtos, conversão kg/g e l/ml, unidades incompatíveis separadas, origens dos ingredientes e arredondamento para cima.
- Edição, marcação e desmarcação de compras, responsáveis e datas, reordenação, categorias de supermercado, favoritos, produtos frequentes, duplicação, conclusão e histórico.
- Atualização do menu **apenas a pedido**, com pré-visualização e confirmação. Preserva itens manuais, estado de compra e produtos comprados que deixaram de ser necessários.
- SSE para invalidar consultas nos outros dispositivos, auditoria e resposta 409 para versões desatualizadas.
- PWA com manifesto, ícones e cache do shell. **Leitura/escrita de dados exige ligação.** Não há fila de alterações offline.
- Recuperação por código de email (30 minutos, hash SHA-256, uso único); troca de palavra-passe invalida as sessões anteriores. Requer SMTP.
- API OpenAPI: depois de entrar, `/api/docs` (JSON) e `/api/swagger` (Swagger UI).

## Primeira utilização em família

1. Crie a primeira conta e ajuste **Família** (por defeito: 2 adultos, 1 criança; equivalência 0,5 editável).
2. Crie um convite para o email da segunda pessoa. Partilhe o código manualmente; convites não enviam emails automáticos.
3. A segunda pessoa cria a sua conta e, antes de criar menus/listas/receitas ou convidar membros, introduz o código em **Família → Recebeste um convite?**.
4. As duas contas passam a ver os mesmos menus, compras, receitas, favoritos e preferências.
5. Gere um menu na página **Semana**. Ao gerar novamente, confirme a substituição. As compras nunca mudam silenciosamente.

## Desenvolvimento sem containers da aplicação

É necessário Java 21 e Maven 3.6.3+; Node 22.12+.

```powershell
docker compose up -d db
# Defina DATABASE_PASSWORD no ambiente do terminal, com o valor do .env.
cd backend
mvn spring-boot:run
```

Noutro terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Abra a URL indicada pelo Vite. O proxy `/api` aponta para `localhost:8080`; cookies permanecem na mesma origem. O backend não aceita CORS de origens arbitrárias.

## Testes

```powershell
cd backend
mvn test
cd ../frontend
npm ci
npm test
npm run build
npm audit
```

Os testes de integração Java usam H2 em modo PostgreSQL **com as migrações Flyway reais e validação do esquema**. O Dockerfile também executa os testes com Java 21.

Com os três serviços em execução, a validação HTTP usa PostgreSQL real:

```powershell
node scripts/smoke.mjs
docker compose restart backend
# Espere pelo arranque do backend (cerca de 10 segundos).
node scripts/smoke.mjs --verify-restart
```

Este teste cria contas e dados identificados como teste, verifica isolamento familiar, 14 refeições, compras, conflitos, ausência de atualização automática, preservação de produtos, eventos SSE, auditoria e OpenAPI. A fase de reinício usa um ficheiro temporário ignorado em `.tools/`, removido após validação. Os dados de teste permanecem apenas na base local.

## Arquitetura e publicação

Consulte [a arquitetura e os contratos](docs/ARCHITECTURE.md) e [as instruções de produção, backups e limitações](docs/DEPLOYMENT.md).

O projeto foi preparado para execução local e publicação com HTTPS por Caddy. Não foi publicado num serviço externo. O envio real de emails e a instalação PWA num telemóvel dependem do ambiente de produção configurado.
