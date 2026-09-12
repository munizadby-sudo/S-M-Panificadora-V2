# ISSUE-016 — Erro interno ao confirmar venda em sequência

- **Status:** Corrigido (2026-08-31)
- **Data:** 2026-08-31
- **Módulo:** `backend/src/modules/sales/infrastructure/MySQLSequenciaRepository.js` (`proximoNumero`); `frontend/src/modules/pdv/index.js` (`tratarAtalhoPagamento`)
- **Severidade:** Alta — no balcão a venda não grava; o operador vê só “Erro interno.” no modal de pagamento
- **Relacionado:** SPEC-BE-007 §2.1; print do operador na loja (2026-08-31); log PM2 `ER_DUP_ENTRY` / `vendas_numero_unique` valor `32`

---

## 1. Sintoma

1. Várias vendas seguidas (R$ 5,00) no mesmo turno.
2. Confirmar de novo (Dinheiro, recebido 5, troco 0).
3. O modal mostra **Erro interno.** A lista à direita já tem as vendas anteriores.

A venda que falhou **não** foi gravada.

---

## 2. Causa

`proximoNumero` usava `INSERT ... ON DUPLICATE KEY UPDATE valor = LAST_INSERT_ID(valor + 1)` e depois `SELECT LAST_INSERT_ID()`. No mysql2, esse `LAST_INSERT_ID` se mistura com o autoincrement de `vendas` na mesma conexão do pool. Duas confirmações rápidas recebiam o mesmo `numero` (aqui, 32). O segundo `INSERT` em `vendas` estourava unique e o mapeador devolvia 500 *Erro interno.*

---

## 3. Correção aplicada

- Sequência: garante a linha, `UPDATE sequencias SET valor = valor + 1`, lê `valor` na transação — sem `LAST_INSERT_ID`.
- Contador da loja alinhado a `MAX(vendas.numero)` (= 32).
- Enter repetido no modal de pagamento é ignorado (`evento.repeat`).
- SPEC-BE-007 §2.1 atualizada.

---

## 4. Teste permanente (canário)

`backend/tests/sales/vendas.concorrencia.test.js` — “oito vendas simultâneas recebem numeros distintos”.

```
▶ concorrência vendas — numero sequencial único
  ✔ oito vendas simultâneas recebem numeros distintos (1037.6568ms)
✔ concorrência vendas — numero sequencial único (1691.2036ms)
▶ HTTP /api/vendas
  ✔ POST com turno aberto debita estoque e lança fluxo_caixa (575.7179ms)
  ✔ POST sem turno aberto retorna 403 CAIXA_FECHADO sem escrever nada (99.4795ms)
  ✔ POST com estoque insuficiente não persiste venda nem débitos parciais (86.0225ms)
  ✔ GET /api/vendas é paginado com limite padrão 20 (66.9358ms)
  ✔ DELETE cancela diretamente com turno aberto (94.3562ms)
  ✔ DELETE na mesma venda cancelada é idempotente e não lança segundo estorno (122.7648ms)
  ✔ DELETE com turno fechado cria correcao_pendente; resolver ajusta turno atual (241.1861ms)
✔ HTTP /api/vendas (1293.7266ms)
ℹ tests 8
ℹ suites 2
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3878.7515
```
