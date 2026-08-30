# ISSUE-013 — Encomenda não tinha comprovante de duas vias

- **Status:** Corrigido (2026-08-30)
- **Data:** 2026-08-30
- **Módulo:** `frontend/src/modules/encomendas` (`cupom.js`, `lista.js`, `index.js`); reusa `frontend/src/modules/pdv/modal-impressao.js`
- **Severidade:** Média — no balcão a cliente leva um papel e a loja precisa do outro no pregador; sem isso o pedido só existia na tela.
- **Relacionado:** SPEC-FE-011 Passo 7; PRD-008; SPEC-FE-007 (mesmo box de impressão / iframe); pedido do operador em 2026-08-30

---

## 1. Sintoma

1. Cadastrar encomenda gravava o pedido e não imprimia nada.
2. Na lista não havia **Imprimir**.
3. Não existia via da cliente nem via da loja no térmico.

---

## 2. Causa

SPEC-FE-011 ia até cancelamento/entrega. Impressão de encomenda não estava no escopo. O cupom de 2 vias já existia só no holerite (A4), não no térmico de balcão.

---

## 3. Correção aplicada

- Depois de **cadastrar** (encomenda nova), abre o box **Imprimir encomenda (2 vias)**.
- Um único papel: **VIA CLIENTE** + corte + **VIA ESTABELECIMENTO**. Mesmo clique, mesmo iframe (`imprimirHtmlEmIframe`) — sem aba nova do Chrome.
- Cada via: número, cliente, telefone, entrega, itens, total, sinal, saldo, observação.
- **Imprimir** na lista reabre o mesmo comprovante (ativa ou entregue). Cancelada não imprime.
- Edição não dispara impressão sozinha — usa o botão da lista.

---

## 4. Teste permanente (canário)

- `frontend/tests/encomendas/passo-impressao.test.js` — duas vias no mesmo HTML; Imprimir na lista; iframe sem `window.open`
- `frontend/tests/encomendas/passo1.test.js` — listagem/semaforo não quebram com o botão novo

Log bruto (2026-08-30):

```
cwd: c:\Users\Panificadora S&M\Desktop\PDV_2V\S-M-Panificadora-V2\frontend
command: npm.cmd test -- tests/encomendas/passo-impressao.test.js tests/encomendas/passo1.test.js

npm warn Unknown env config "devdir". This will error in a future major version of npm. See `npm help npmrc` for supported config options.
npm notice run test
npm notice run node --test tests/encomendas/passo-impressao.test.js tests/encomendas/passo1.test.js
▶ Passo 7 — comprovante de encomenda em duas vias
  ✔ data de entrega não vira o dia anterior por fuso (3.3362ms)
  ✔ um cupom traz via do cliente e via da loja, no mesmo papel (107.2163ms)
  ✔ lista oferece Imprimir em encomenda ativa e entregue, não na cancelada (3.6508ms)
  ✔ módulo imprime no iframe, sem aba nova (1.3122ms)
✔ Passo 7 — comprovante de encomenda em duas vias (120.5819ms)
▶ Passo 1 — listagem com filtro por status
  ✔ módulo exporta o contrato da SPEC-FE-001 (4.6636ms)
  ✔ listarEncomendas consome GET /encomendas com filtro de status e período (6.0614ms)
  ✔ tabela mostra número, cliente, entrega, sinal, total e semáforo de status (92.4156ms)
  ✔ encomenda cancelada não mostra ação de avançar status, só o rótulo (2.0878ms)
  ✔ encomenda entregue trava edição e só admin vê Reabrir (2.9374ms)
  ✔ encomenda pronta oferece entregar, com dica de aguardando retirada (1.7021ms)
  ✔ filtros incluem status e período de entrega (1.3452ms)
✔ Passo 1 — listagem com filtro por status (116.5233ms)
ℹ tests 11
ℹ suites 2
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 607.5563
```

---

## 5. Revisão de decisão

Em 2026-08-30 o operador pediu duas vias na **encomenda** (cliente + estabelecimento), não no Fluxo. Segunda via do cupom de **venda** do PDV ficou para o lado do Estornar e ainda não foi feita.
