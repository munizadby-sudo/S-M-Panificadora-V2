# ISSUE-003 — Fechar caixa duas vezes no mesmo `turno_id` caía em erro (idempotência quebrada)

- **Status:** Corrigido (2026-08-17)
- **Data:** 2026-08-16 / 2026-08-17
- **Módulo:** `backend/src/modules/cash-register` (`FecharCaixa` + `POST /api/caixa-turno/fechar`)
- **Severidade:** Alta (duplo clique ou retry de rede virava erro de negócio em vez de devolver o resumo já persistido)
- **Relacionado:** SPEC-BE-002 Seção 4.3 e 6.4; correção de design de 2026-08-16

---

## 1. Sintoma

`POST /api/caixa-turno/fechar` buscava “o turno aberto”, não um `turno_id` explícito.

1. Primeira chamada fechava o turno com sucesso (200).
2. Segunda chamada (duplo clique / retry) não encontrava turno aberto.
3. Resposta era erro (`NenhumTurnoAbertoError`, 400) em vez do resumo já calculado.

---

## 2. Causa

O caso de uso usava `buscarTurnoAberto()`. Depois do primeiro fechamento não existe mais turno aberto, então a segunda chamada nunca chegava no caminho idempotente.

---

## 3. Correção aplicada

- O body exige `turno_id`.
- Busca por ID: inexistente → `TurnoNaoEncontradoError` (404); já fechado → resumo persistido com `idempotente: true`; aberto → cálculo + `UPDATE` atômico.

---

## 4. Teste permanente (canário)

Arquivo: `backend/tests/cash-register/caixa-turno.test.js`

Nome: **fechar o mesmo turno_id duas vezes retorna 200 e idempotente true na segunda**

Critério:

1. Abrir turno.
2. `POST /fechar` com esse `turno_id` → **200**, `idempotente: false`.
3. Mesmo `POST` imediatamente, mesmo corpo → **200**, `idempotente: true`, mesmo resumo (esperado, contado, diferença) — nunca erro.

Confirmado na suíte `npm.cmd test` (backend **50/50** em 2026-08-17).
