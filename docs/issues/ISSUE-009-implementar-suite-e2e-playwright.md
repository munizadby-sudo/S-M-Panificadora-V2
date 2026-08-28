# ISSUE-009 — Implementar a suíte E2E de navegador (Playwright)

- **Status:** Aberto
- **Data:** 2026-08-27
- **Módulo:** novo diretório de testes E2E (`e2e/` na raiz ou `frontend/e2e/`); `frontend/servir.mjs`; `backend` (banco/seed de teste)
- **Severidade:** N/A — trabalho de infraestrutura de teste, não é bug
- **Relacionado:** `docs/adr/ADR-006-testes-e2e-de-navegador-playwright.md` (esta issue é a implementação dele); `ISSUE-001`, `ISSUE-006`, `ISSUE-007`, `ISSUE-008` (classes de bug que a suíte deve passar a cobrir); `demo/gravar.mjs` (uso pré-existente de Playwright)

---

## 1. Objetivo

Colocar de pé a camada de teste E2E decidida na ADR-006: Playwright rodando a aplicação real (`servir.mjs` + backend Express) num navegador de verdade, nos três motores (`chromium`, `firefox`, `webkit`).

ADR-006 foi aceita em 2026-08-27 — implementação liberada.

---

## 2. Escopo desta issue

- Andar 1 (mínimo viável): infraestrutura + **uma** jornada de prova de conceito.
- As decisões de **escopo da suíte** (poucos fluxos × cobertura ampla × substituir `frontend/tests/`) e de **CI** (GitHub Actions × só local) ficam na ADR-006 §5 e **não** são resolvidas aqui — esta issue entrega o mínimo e para para a equipe decidir o resto.

---

## 3. Tarefas

1. [ ] Criar o diretório de E2E com `@playwright/test` e `playwright.config` com projetos `chromium`, `firefox`, `webkit`.
2. [ ] Configurar `webServer` na config para subir `frontend/servir.mjs` + backend contra um banco/seed de teste isolado.
3. [ ] Definir a estratégia de dados de teste ponta a ponta (banco descartável, seed fixo, ou reset por teste) — documentar a escolha.
4. [ ] Escrever a jornada de prova de conceito: **login → venda em dinheiro → conferir troco na tela → comprovante impresso** (cobre `ISSUE-001` / `ISSUE-006`).
5. [ ] Adicionar script `npm run e2e` e documentar no `README.md` como rodar, incluindo `npx playwright install`.
6. [ ] Alinhar a versão de `playwright` usada em `demo/` com a de `@playwright/test` (ou registrar por que ficam separadas).
7. [ ] Levar as decisões da ADR-006 §5 (escopo e CI) para a equipe e registrar o resultado — atualizar a ADR ou abrir issue de continuação.

---

## 4. Critérios de aceite

- `npm run e2e` roda a jornada de PoC nos três motores e passa localmente (Windows).
- Falha de teste gera `trace` inspecionável no `trace viewer`.
- O `README.md` explica o setup (`npx playwright install`) e o comando.
- A suíte não depende de dados manuais no banco — sobe seu próprio estado.
- `frontend/tests/` (`node --test`) continua intacto e passando.

---

## 5. Fora de escopo

- Cobertura de mais de uma jornada (depende da decisão de escopo — ADR-006 §5.1).
- Pipeline de CI (depende da decisão de CI — ADR-006 §5.2).
- Testes de componente / adoção de framework de UI (ADR-003 §7).
