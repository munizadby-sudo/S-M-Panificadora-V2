# ISSUE-004 — Teste de concorrência de produtos falha com 401/401 em vez de 200/409

- **Status:** Corrigido (2026-08-17)
- **Data:** 2026-08-17
- **Módulo:** `backend/tests/products/produtos.concorrencia.test.js` (teste do índice único `(categoria_id, nome)`) — SPEC-BE-004 (Produtos e Categorias)
- **Severidade:** Média — bloqueava a validação automatizada de uma proteção crítica contra condição de corrida; não chegou a ser um bug de produção, a causa estava na autenticação dentro do próprio teste.
- **Relacionado:** SPEC-BE-004, critério de aceite 2; nota de numeração compartilhada com ISSUE-001 (ver Seção 5)

---

## 1. Sintoma

O teste que valida o índice único `(categoria_id, nome)` sob concorrência (duas requisições simultâneas criando produto com o mesmo nome na mesma categoria) falhava:

- **Esperado:** uma requisição retorna `200` (criação bem-sucedida), a outra `409` (nome duplicado na categoria) — confirmando que o índice único do banco protege contra a condição de corrida mesmo quando a checagem de aplicação não é suficiente sozinha.
- **Obtido:** as duas requisições retornavam `401` (não autenticado).

```
✖ duas criações simultâneas do mesmo nome na mesma categoria: uma 200 e outra 409 (389.1794ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    [
  +   401,
  +   401
  -   200,
  -   409
    ]

  at tests/products/produtos.concorrencia.test.js:144:14
```

---

## 2. Causa

As duas requisições concorrentes não estavam sendo autenticadas corretamente — token ausente, expirado, ou não propagado igualmente para as duas chamadas paralelas dentro do teste. Não há evidência, a partir deste log, de que o índice único em si estivesse com problema; o teste não chegou a exercitar essa regra porque falhava antes, na autenticação.

---

## 3. Correção aplicada

Autenticação das duas chamadas concorrentes propagada corretamente dentro do teste, permitindo que a corrida chegue de fato ao índice único do banco.

---

## 4. Teste permanente (canário)

`backend/tests/products/produtos.concorrencia.test.js` — caso "duas criações simultâneas do mesmo nome na mesma categoria: uma 200 e outra 409".

Log bruto completo da suíte após a correção:

```
tests 70
pass 70
fail 0
```

Trecho relevante:

```
▶ concorrência produtos — índice único (categoria_id, nome)
  ✔ duas criações simultâneas do mesmo nome na mesma categoria: uma 200 e outra 409 (504.5129ms)
```

Retorna `[200, 409]`, confirmando que o índice único protege contra a condição de corrida sob autenticação correta.

---

## 5. Nota de processo

O resumo textual fornecido pelo agente (Cursor) após rodar a suíte relatou `50/50, 0 falhas`, mas o **log bruto da mesma execução** mostrava `tests 50 / pass 49 / fail 1`, incluindo este erro. O resumo divergiu do resultado real.

**Ação preventiva:** daqui em diante, toda confirmação de "suíte passando" deve vir acompanhada do log bruto (`npm.cmd test` colado por completo), não apenas do resumo em texto do agente — o resumo por si só não é confiável como evidência de conclusão de uma SPEC.

Esta issue é rastreada no repositório como `ISSUE-004-teste-concorrencia-produtos-401.md` — o número `ISSUE-001` já estava em uso por outro bug (impressão em branco no fechamento de caixa). Renomeada para bater com o repositório.
