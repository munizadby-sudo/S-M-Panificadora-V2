# SPEC-BE-015 — Sinal da encomenda no fluxo de caixa

- **Status:** Aprovada e implementada (2026-08-26)
- **Data:** 2026-08-26
- **Módulo:** `backend/src/modules/orders` (+ `fluxo_caixa` via repositório já usado em `FinalizarEncomenda`)
- **Depende de:** SPEC-BE-011 (encomenda), SPEC-BE-002 / SPEC-BE-008 (`fluxo_caixa`, `encomenda_id`, `categoria: 'encomenda'`)
- **PRD de origem:** `PRD-018-sinal-e-pagamento-encomenda.md`
- **Consumido por:** SPEC-FE-019
- **Não muda:** estoque (ADR-002 Decisão 3), venda do PDV, cálculo de `saldoAReceber()`, ciclo de status

---

## 0. Decisões já tomadas (não reabrir)

- Sinal > 0 na **criação** lança entrada no turno aberto. Sinal 0 não lança e **não** exige caixa.
- `recebido` / troco **não** entram no contrato HTTP. O backend grava só `valor` (sinal ou saldo) e `forma`.
- Reabrir ou cancelar precisa zerar **todos** os lançamentos ativos da encomenda (hoje `buscarAtivoPorEncomendaId` usa `LIMIT 1` — isso quebra quando houver sinal + saldo).
- Editar `sinal` depois que já existe lançamento de sinal ativo → 400. Mudar itens continua permitido; o saldo da entrega usa o sinal gravado.

---

## 1. Objetivo técnico

Na criação, se `sinal > 0`, registrar `fluxo_caixa` no mesmo turno da gaveta. Na entrega, continuar lançando só o saldo. Estorno de reabertura/cancelamento cobre os dois lançamentos.

---

## 2. Descrição dos lançamentos

Mesma categoria `encomenda`, `gerado_auto: true`, `encomenda_id` preenchido. Texto só muda o prefixo:

| Quando | `valor` | `descricao` (padrão) |
|---|---|---|
| `CreateEncomenda` com sinal > 0 | sinal | `Sinal encomenda Nº {numero} — {clienteNome}` |
| `FinalizarEncomenda` com saldo > 0 | saldo | `Encomenda Nº {numero} — {clienteNome}` (igual hoje) |

O sufixo `[auto]` da listagem, se existir só no frontend, não precisa ser duplicado aqui.

---

## 3. Passos (cada um testável sozinho)

Não começar o passo seguinte sem o canário do anterior verde.

### Passo 1 — Repositório: listar todos os lançamentos ativos da encomenda

Trocar o uso de `buscarAtivoPorEncomendaId` (um id) por `listarAtivosPorEncomendaId(encomendaId)` → array.

- Sem linhas → `[]`.
- Duas linhas ativas (sinal + saldo) → as duas, nenhuma `LIMIT 1`.

- **Testável:** helper em memória + teste de repositório/memória sem MySQL. `FinalizarEncomenda` / reabrir ainda não mudam neste passo, só o método novo existe e o antigo pode delegar para `lista[0]` temporariamente se ainda houver um único caller.

### Passo 2 — Reabrir e cancelar estornam a lista inteira

`UpdateStatusEncomenda` (entregue → pronto, admin) e `CancelEncomenda`: para cada lançamento ativo com aquele `encomenda_id`, `marcarExcluido` (mesmo motivo de hoje).

- **Testável:** encomenda com dois lançamentos ativos em memória; reabrir → os dois `ativo=0`. Cancelar pendente com um lançamento de sinal → esse lançamento `ativo=0`. Encomenda entregue continua recusando cancelar (SPEC-BE-011).

### Passo 3 — `CreateEncomenda` lança o sinal

No mesmo `comTransacao` da criação, **depois** de persistir a encomenda:

1. Se `sinal == 0`, comportamento atual (sem caixa, sem `forma`).
2. Se `sinal > 0`:
   - turno aberto obrigatório (`CaixaFechadoError` 403, mensagem no espírito de “Abra o caixa para receber o sinal.”)
   - `forma` obrigatória (`dinheiro|pix|cartao|credito`)
   - `fluxoCaixaRepository.registrar` entrada, valor = sinal, textos da Seção 2
3. Auditoria `criar_encomenda` ganha `sinal_lancado` e `forma` no `estadoDepois` quando houver lançamento.

Injetar `caixaTurnoRepository` e `fluxoCaixaRepository` no caso de uso (espelhar `FinalizarEncomenda`).

- **Testável:** sinal 0 + caixa fechado → 200, sem fluxo. Sinal 5 + caixa fechado → 403, encomenda **não** criada. Sinal 5 + caixa aberto + `forma: 'pix'` → encomenda + 1 lançamento valor 5.

### Passo 4 — `PUT` não relança nem altera sinal já no caixa

`UpdateEncomenda`: se existir lançamento ativo cuja descrição começa com `Sinal encomenda` **ou** (mais estável) se existir qualquer lançamento ativo da encomenda **e** o `sinal` enviado for diferente do persistido → `SinalJaLancadoError` 400 (“Sinal já lançado no caixa. Não altere o valor.”).

Se o sinal enviado é **igual** ao gravado, a edição de itens/contato segue.

Detectar “é o lançamento de sinal” pelo prefixo da descrição neste corte (sem coluna nova). Alternativa aceitável se ficar mais limpo: só recusar mudança de `sinal` quando `listarAtivosPorEncomendaId` não está vazio **e** `sinal` novo ≠ `sinal` antigo — cobre sinal lançado; um saldo só existe depois de entregue, e entregue já não edita.

Entregue já é 403. Então: **qualquer mudança de `sinal` com lançamento ativo da encomenda** → 400. Com zero lançamentos (paga depois), pode alterar sinal — **neste corte não lança o sinal no PUT**. Receber sinal depois da criação fica fora (PRD-018 §4).

- **Testável:** criar sinal 5 (lança); PUT com sinal 5 e outro item → 200. PUT com sinal 0 → 400. Criar sinal 0; PUT sinal 5 → 200, **sem** novo fluxo (documentado; o 5 só vale para o saldo na entrega).

Nota do passo 4 no PUT sinal 0→5 sem lançar: o PRD diz que sinal entra na criação. Mudar 0→5 na edição **não** mete dinheiro no caixa neste corte. O canário deixa isso explícito para ninguém “corrigir” no escuro.

### Passo 5 — Contrato HTTP da criação

`POST /api/encomendas` aceita `forma` (opcional). Obrigatória só se `sinal > 0`.

```json
{
  "sinal": 5,
  "forma": "dinheiro",
  "itens": [{ "produto_id": 12, "quantidade": 20 }]
}
```

Erros novos:

| Status | Quando |
|---|---|
| 403 | sinal > 0 e caixa fechado |
| 400 | sinal > 0 e `forma` ausente/inválida |

`POST /finalizar` **não** ganha `recebido`. Continua `{ "forma": "dinheiro" }`.

- **Testável:** teste HTTP (ou caso de uso + controller) dos 403/400 acima; finalizar inalterado.

---

## 4. Fora de escopo

- Coluna `tipo_lancamento` / `sinal` vs `saldo` no schema
- `recebido` persistido
- Lançar sinal no `PUT`
- Flag no cliente
- Debitar estoque

---

## 5. Critérios de aceite

1. Sinal 0 cria sem turno aberto e sem linha no fluxo.
2. Sinal > 0 cria só com turno aberto e forma; uma entrada no fluxo com o valor do sinal.
3. Finalizar ainda lança só o saldo; os dois podem coexistir no mesmo `encomenda_id`.
4. Reabrir e cancelar marcam `ativo=0` em **todos** os lançamentos da encomenda.
5. `PUT` não muda sinal se já houver lançamento ativo; não inventa lançamento de sinal na edição.
6. Passos 1→5 com canário verde isolado.
