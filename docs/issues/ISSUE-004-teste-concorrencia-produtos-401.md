## Status
Corrigido (2026-08-17). Confirmado com log bruto completo: `tests 70 / pass 70 / fail 0`. O teste específico:
```
▶ concorrência produtos — índice único (categoria_id, nome)
  ✔ duas criações simultâneas do mesmo nome na mesma categoria: uma 200 e outra 409 (504.5129ms)
```
retorna `[200, 409]`, confirmando que o índice único protege contra a condição de corrida sob autenticação correta.

**Nota de numeração:** esta issue é rastreada no repositório como `docs/issues/ISSUE-004-teste-concorrencia-produtos-401.md` — o número `ISSUE-001` já estava em uso pelo Cursor para outro bug (impressão em branco no fechamento de caixa). Renomeado aqui para bater com o repositório.

## Título
Teste de concorrência de produtos falha com 401/401 em vez de 200/409

## Módulo
`backend/tests/products/produtos.concorrencia.test.js` — SPEC-BE-004 (Produtos e Categorias)

## Descrição

O teste que valida o índice único `(categoria_id, nome)` sob concorrência (duas requisições simultâneas criando produto com o mesmo nome na mesma categoria) está falhando.

**Esperado:** uma requisição retorna `200` (criação bem-sucedida), a outra retorna `409` (nome duplicado na categoria), confirmando que o índice único do banco protege contra a condição de corrida mesmo quando a checagem de aplicação não é suficiente sozinha (SPEC-BE-004, critério de aceite 2).

**Obtido:** as duas requisições retornam `401` (não autenticado).

## Log de erro

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

## Hipótese de causa raiz

As duas requisições concorrentes provavelmente não estão sendo autenticadas corretamente — token ausente, expirado, ou não propagado igualmente para as duas chamadas paralelas dentro do teste. Não há evidência, a partir deste log, de que o índice único em si esteja com problema; o teste não chegou a exercitar essa regra porque falhou antes, na autenticação.

## Nota de processo (importante)

O resumo textual fornecido pelo agente (Cursor) após rodar a suíte reportou `50/50, 0 falhas`, mas o **log bruto da mesma execução** mostra `tests 50 / pass 49 / fail 1`, incluindo esse erro. O resumo divergiu do resultado real.

**Ação preventiva:** daqui em diante, toda confirmação de "suíte passando" deve vir acompanhada do log bruto (`npm.cmd test` colado por completo), não apenas do resumo em texto do agente — o resumo por si só não é confiável como evidência de conclusão de uma SPEC.

## Critério de aceite para fechar esta issue

- [ ] Teste corrigido (autenticação das duas chamadas concorrentes propagada corretamente)
- [ ] Teste efetivamente confirma `[200, 409]` (ou equivalente, com os status trocados dependendo de qual requisição "ganha" a corrida)
- [ ] Log bruto de `npm.cmd test` colado no fechamento da issue, mostrando o total real de testes passando
