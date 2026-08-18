# ISSUE-001 — Impressão da prévia de fechamento abre janela vazia (`about:blank`)

- **Status:** Corrigido (2026-08-16)
- **Data:** 2026-08-16
- **Módulo:** `frontend/src/modules/caixa-turno` (`fechamento.js` → `imprimirHtml`)
- **Severidade:** Alta (bloqueia o caminho feliz de fechamento com comprovante; em alguns casos a UI trata como falha e libera “Prosseguir sem impressão”)
- **Relacionado:** SPEC-FE-003, PRD-004; evidência visual salva em sessão de QA (Chrome → aba `about:blank` após “Imprimir prévia”)

---

## 1. Sintoma

Na tela de Caixa com turno aberto, ao clicar **Imprimir prévia** / **Imprimir comprovante**:

1. O navegador abre uma nova aba/janela.
2. A URL fica em `about:blank`.
3. O conteúdo do comprovante **não aparece**.

---

## 2. Causa

`window.open('', '_blank', 'noopener,noreferrer')` — com `noopener` o Chrome não devolve referência utilizável a `janela.document`.

---

## 3. Correção aplicada

`imprimirHtml` agora abre com `window.open('', '_blank')` **sem** `noopener`/`noreferrer`, escreve o HTML e chama `print()`.

Coberto por teste em `frontend/tests/caixa-turno/passo3-4.test.js` (ISSUE-001).

Fluxo de UX do fechamento também foi redesenhado (contar → revisar → imprimir → fechar); ver SPEC-FE-003.

---

## 4. Nota de processo — log bruto vs resumo

Não reportar contagem da suíte (`52/52`, `90/90`) sem colar o log completo do `npm.cmd test` (do `PS C:...` até `tests / pass / fail`). Já houve divergência entre resumo em texto e a execução real. O canário de concorrência de produtos (`401/401` em vez de `[200, 409]`) está na **ISSUE-004**, não nesta.
