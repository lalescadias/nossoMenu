# Validação realizada

Em 29 de outubro de 2026:

- Backend compilado e testado no Docker com Java 21: **6 testes, zero falhas**. Incluem cálculo e reconciliação de compras, isolamento familiar, CSRF, partilha entre duas contas, versões desatualizadas, substituição confirmada do menu, paginação e recuperação por email simulado sem envio real.
- Frontend: **4 testes, zero falhas**. Incluem marcação de produtos, confirmação antes de atualizar pelo menu, produtos manuais de limpeza e preservação da versão original de uma receita durante edições remotas.
- TypeScript e build Vite de produção concluídos.
- Auditoria npm sem vulnerabilidades no momento da instalação final; também verificada a árvore de produção.
- PostgreSQL 17 real em Docker: três migrações Flyway aplicadas e esquema validado pelo Hibernate.
- Smoke HTTP real: cookies e CSRF, registo/login, convite, duas contas na mesma família, isolamento de uma terceira família, catálogo de 18 receitas, menu com 14 refeições, lista gerada, produtos manuais, marcação partilhada, rejeição de versão antiga, menu sem atualização automática das compras, atualização confirmada, preservação de itens comprados/manuais, evento SSE recebido, auditoria e OpenAPI.
- Reinício do backend seguido de novo login: estado e quantidades das compras preservados.

Os testes criam apenas contas locais de teste e não enviam emails reais. Os três serviços permanecem em execução em `http://localhost:8088`.

## Validações que dependem do ambiente

A automação visual do Chrome foi interrompida pela ferramenta por não conseguir determinar o URL atual com confiança suficiente para aplicar as suas regras. Não foi concluída a revisão visual num navegador real, nem a instalação num telemóvel.

O manifesto PWA, os ícones PNG, o service worker e o layout responsivo estão implementados; a instalação deve ser ensaiada num dispositivo compatível após configurar HTTPS. Não há operações offline nem sincronização posterior de escritas.

Não foi efetuada publicação externa, envio SMTP real ou um ensaio de recuperação de backup numa infraestrutura externa. As instruções e a configuração estão em `DEPLOYMENT.md`.
