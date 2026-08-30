# ISSUE-014 — E2E além do Chromium da demo ainda não existe

- **Status:** Aberta — não priorizada (2026-08-30)
- **Data:** 2026-08-30
- **Módulo:** `demo/specs/` (`navegador.test.js`); eventual pasta `e2e/` se esta issue for priorizada
- **Severidade:** Baixa — o balcão hoje é Chrome no Windows; login, caixa e venda já são conferidos por `cd demo && npm run testar` (SPEC-FE-020)
- **Relacionado:** ADR-006; SPEC-FE-020; ISSUE-001, ISSUE-006 (impressão); ISSUE-007, ISSUE-008 (foco/scroll)

---

## 1. Sintoma

1. A suíte de navegador só exercita Chromium.
2. Não há projeto `@playwright/test` com Firefox e WebKit.
3. Janela de impressão real e backend MySQL de teste não entram em `npm run testar` (a demo usa API em memória e stub de impressão).

Isso **não** é bug de caixa. É o teto do andar 1, registrado para não misturar com a ISSUE-009 (modal após abrir o turno).

---

## 2. Causa

A ADR-006 escolheu Playwright e, em 2026-08-30, fechou o escopo desta fase no que já existe em `demo/`. Firefox, WebKit e pasta `e2e/` ficaram de fora de propósito — não por esquecimento.

---

## 3. Correção proposta

Não implementar até o produto priorizar. Quando priorizar:

- Reusar `demo/specs/navegador.test.js` e `harness.mjs`; não começar do zero.
- Só então decidir se sobe `@playwright/test` com três motores ou se continua um `test()` novo na demo.
- `frontend/tests/` (`node --test`) permanece intacto.
- Cypress continua fora (ADR-006 §4.2).

---

## 4. Teste permanente (canário)

Enquanto esta issue estiver aberta, o canário do andar 1 é a SPEC-FE-020: `cd demo && npm run testar`. Não há log novo aqui — nada foi implementado nesta issue.

---

## 5. Critério de aceite para fechar esta issue

- [ ] Produto priorizou a expansão (comercializar para outro navegador, ou classe de bug que o Chromium da demo não pega).
- [ ] Decisão registrada: continua em `demo/` **ou** muda para `e2e/` — uma suíte só, sem terceiro runner.
- [ ] Se três motores: `chromium`, `firefox` e `webkit` passam a jornada acordada no Windows.
- [ ] `frontend/tests/` segue verde.

---

## 6. Nota de processo

A branch `claude/adr-cypress-playwright-4922ae` gravou isto como `ISSUE-009-implementar-suite-e2e-playwright.md`. Neste repositório a ISSUE-009 já é o modal “Fechar caixa” após abertura. Por isso o número desta expansão é **014**. Não mergear aquele arquivo como ISSUE-009.
