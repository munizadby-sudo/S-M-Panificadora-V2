# ADR-006 — Testes E2E de Navegador: Playwright

- **Status:** Aceita
- **Data:** 2026-08-27 (aceita nesta árvore em 2026-08-30)
- **Decisores:** Equipe do projeto
- **Escopo:** Frontend do `S-M-Panificadora-V2` — camada de teste que exercita a aplicação num navegador real
- **Origem:** conversa sobre adotar Cypress ou Playwright. A ferramenta é Playwright. Em 2026-08-30 esta cópia do projeto fechou o *quando* e o *quanto*: o andar 1 já existe em `demo/`; não se abre pasta `e2e/` agora; Cypress não entra.

---

## 1. Contexto

Todos os testes em `frontend/tests/` rodam com `node --test` sobre um **ambiente simulado escrito à mão** (`frontend/tests/helpers/ambiente.js`): um `localStorage` em `Map`, um `location` falso e um `document` mínimo. Não é jsdom — é um dublê ainda mais raso.

Isso cobre bem lógica de módulo, payload, roteamento, sessão e contratos de HTML. **Não cobre:** layout e CSS reais, foco e teclado (F1, setas, Tab, Enter), janela de impressão, viewport real, nem o front servido conversando com o Express de verdade.

O custo já apareceu: `ISSUE-001`, `ISSUE-006` (impressão em branco), `ISSUE-007` (setas da grade após F1), `ISSUE-008` (scroll do cliente) — pegos no balcão, não por teste automatizado.

**Restrições:**

- Sem build step obrigatório no frontend de produção (ADR-003 §2.1). Teste pode ter dependência de dev própria.
- Já existe Playwright no repositório: `demo/package.json` (`playwright@^1.62.1`) em `demo/gravar.mjs` e, desde 2026-08-27, em `demo/specs/` (SPEC-FE-020).
- O balcão roda Chrome/Edge no Windows. Firefox e WebKit (Mac/iPad) são intenção futura, não requisito do piloto.
- Sem orçamento para serviço pago de execução de testes nesta fase.

---

## 2. Decisão

Adotar **Playwright** como a única ferramenta de teste de navegador do frontend.

Decisões fechadas em 2026-08-30 (esta árvore):

1. **Não** adotar Cypress.
2. **Não** substituir `frontend/tests/` (`node --test`) por E2E.
3. O andar 1 **já está feito**: SPEC-FE-020 — Chromium em `demo/specs/`, API em memória, `cd demo && npm run testar`. Ampliar cobertura = novo `test()` nesse arquivo, mapeado a um passo de spec, **sem terceiro runner**.
4. **Não** criar pasta `e2e/` nem projeto `@playwright/test` com Firefox + WebKit agora.
5. CI (GitHub Actions) **não** entra agora — a suíte roda local quando alguém a dispara.
6. Implantação na loja (PM2, backup, `.env` de produção) é assunto **outro**, não desta ADR.

---

## 3. Justificativa

- **Uma ferramenta só.** `demo/` já usa Playwright. Cypress no mesmo repo seria a segunda API de automação.
- **A dor concreta é multi-janela.** Os bugs que mais escaparam envolvem impressão e foco — o modelo de uma aba do Cypress é mais fraco aqui.
- **WebKit não decide o piloto.** Playwright trata os três motores como iguais, e isso continua válido *quando* formos comercializar para Mac/iPad. Hoje o balcão é Chrome no Windows; baixar ~1 GB de três navegadores não ajuda a vender pão.
- **O que se perde:** o painel time-travel do Cypress. Mitigação: `--ui` e `trace viewer` da Playwright, quando a suíte crescer.

---

## 4. Alternativas consideradas

### 4.1 Playwright

Já em uso em `demo/`. Três motores de primeira classe; múltiplas páginas e popups; paralelismo sem serviço pago.

**Adotada** — e, nesta fase, só o Chromium que a SPEC-FE-020 já baixa.

### 4.2 Cypress

WebKit experimental; um teste = uma aba (fraco na impressão); paralelismo de verdade exige Cypress Cloud (pago); nenhuma familiaridade no projeto; `demo/` continuaria em Playwright.

**Não adotada.**

### 4.3 Não adotar ferramenta; expandir `node --test` com jsdom

jsdom não renderiza CSS, não implementa `window.open` de verdade, foco e teclado são parciais. Dá falsa sensação de cobertura.

**Não adotada** como substituto do navegador. O `node --test` **permanece** para lógica de módulo.

---

## 5. O que ficou estacionado (não é “em aberto” no sentido de falta de escolha)

| Tema | Escolha agora | Quando reabrir |
|---|---|---|
| Escopo da suíte | Poucos fluxos críticos, no `demo/` (SPEC-FE-020) | Comercializar para outro SO/navegador, ou classe de bug que o Chromium da demo não pega |
| Três motores | Só Chromium | ISSUE-014 |
| Pasta `e2e/` + `@playwright/test` | Não | ISSUE-014 |
| CI a cada PR | Não | Quando houver `.github/` e a suíte for estável o bastante para não virar ruído |
| Trocar `frontend/tests/` por E2E | Não | Só se o dublê de `document` virar custo maior que a suíte lenta |

---

## 6. Consequências

**Positivas**
- Decisão de ferramenta registrada: Playwright, não Cypress.
- Andar 1 já protege login, caixa e venda sem nova dependência.
- `frontend/tests/` continua rápido e estável.

**Negativas**
- Firefox, WebKit, janela de impressão real e backend MySQL de teste **não** entram nesta ADR.
- Enquanto ninguém rodar `cd demo && npm run testar`, a suíte não protege o merge.

**A revisitar**
- ISSUE-014 (expansão além do Chromium da demo).
- Se um framework de UI for adotado (ADR-003 §7), reavaliar testes de componente.

---

## 7. Relação com outros documentos

- `ADR-003-fundacao-e-arquitetura-do-frontend.md` — frontend vanilla sem build; esta ADR adiciona E2E sem violar isso.
- `ADR-004-seguranca-e-testabilidade-do-backend.md` — domínio sem infra real; o E2E é a camada complementar.
- `docs/specs/SPEC-FE-020-specs-no-navegador.md` — andar 1 implementado (Chromium em `demo/`).
- `docs/issues/ISSUE-014-e2e-alem-do-chromium-da-demo.md` — expansão estacionada.
- `ISSUE-001`, `ISSUE-006`, `ISSUE-007`, `ISSUE-008` — classes de bug que motivam navegador real.

**Número ocupado:** `ISSUE-009` nesta árvore é o modal “Fechar caixa” após abertura (`ISSUE-009-modal-fechar-caixa-apos-abertura.md`). A branch `claude/adr-cypress-playwright-4922ae` usou o mesmo número para “implementar suíte E2E”. Esse arquivo **não** deve ser mergeado como ISSUE-009.

---

## 8. Critérios para revisão

Esta ADR poderá ser revisada se:

- a suíte em `demo/` se mostrar cronicamente instável;
- a Playwright deixar de cobrir o motor que o balcão usa;
- a comercialização exigir Firefox ou WebKit de verdade (aí entra a ISSUE-014);
- um framework de UI for adotado (ADR-003 §7).
