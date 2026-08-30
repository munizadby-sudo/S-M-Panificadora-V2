# ISSUE-012 — PDV não tinha como estornar venda do turno aberto

- **Status:** Corrigido (2026-08-30)
- **Data:** 2026-08-30
- **Módulo:** `frontend/src/modules/pdv` (`lista-turno.js`, `modal-estorno-venda.js`, `index.js`); `backend/src/modules/sales/application/CancelSale.js`
- **Severidade:** Alta no balcão — venda lançada errada só saía pelo API/`admin`; segundo DELETE na mesma venda virava 404 e a UI não existia.
- **Relacionado:** SPEC-FE-007 Passo 9; SPEC-BE-007 §4.2 e §5.3; ADR-002 Decisão 2; PRD-003; pedido do operador em 2026-08-30 (alternativa C)

---

## 1. Sintoma

1. Na tela **Vendas**, depois de confirmar, não havia lista das vendas daquele turno.
2. Não existia botão **Estornar**. O `DELETE /api/vendas/:id` já existia (só `admin`), mas o balcão não chegava nele.
3. Segundo DELETE numa venda já `cancelada` respondia 404 `VendaNaoEncontradaError` — seguro contra estorno duplo, ruim de usar.

---

## 2. Causa

O backend de cancelamento (SPEC-BE-007) estava pronto. O frontend do PDV parava na confirmação + cupom. `CancelSale` tratava `status === 'cancelada'` como “não encontrada”.

Não se copiou motor genérico de refund (gateway, tabela `Refunds`, estorno parcial). Aqui o dinheiro está na gaveta.

---

## 3. Correção aplicada

- Lista **Vendas deste turno** na lateral do PDV (`GET /api/vendas?turno_id=`, via `obterTurnoId()` — nunca `GET /caixa-turno/status` direto).
- **Estornar** só para `admin`, só em venda `confirmada`. Motivo obrigatório. Aviso: não dá para desfazer.
- Chama o `DELETE` existente. Turno aberto: estoque de volta + `fluxo_caixa` `categoria: 'estorno'` no mesmo turno.
- Segundo DELETE devolve `{ status: 'cancelada', tipo: 'cancelamento_direto', idempotente: true }` sem novo lançamento nem novo estoque.
- Venda de turno fechado não entra nessa lista (continua `correcao_pendente` no backend).

---

## 4. Teste permanente (canário)

- `frontend/tests/pdv/passo9-estorno.test.js` — lista, botão só no admin, operador sem Estornar, contrato `GET`/`DELETE`
- `backend/tests/sales/vendas.http.test.js` — `DELETE na mesma venda cancelada é idempotente e não lança segundo estorno`

Log bruto (2026-08-30):

```
cwd: c:\Users\Panificadora S&M\Desktop\PDV_2V\S-M-Panificadora-V2\frontend
command: npm.cmd test -- tests/pdv/passo9-estorno.test.js

npm warn Unknown env config "devdir". This will error in a future major version of npm. See `npm help npmrc` for supported config options.
npm notice run test
npm notice run node --test tests/pdv/passo9-estorno.test.js
▶ Passo 9 — estorno do turno aberto (alternativa C)
  ✔ lista mostra número, hora, total e forma (134.9433ms)
  ✔ Estornar só aparece para admin em venda confirmada (4.9471ms)
  ✔ modal pede motivo e avisa que não dá para desfazer (3.0919ms)
  ✔ listarVendas e estornarVenda usam o contrato existente (5.6897ms)
  ✔ 403 de estorno vira mensagem para o balcão (2.327ms)
  ✔ PDV do admin lista vendas do turno e mostra Estornar (10.8921ms)
  ✔ operador vê a lista e não vê Estornar (5.3036ms)
  ✔ módulo consulta vendas pelo turno do estado, nunca status direto (1.5473ms)
✔ Passo 9 — estorno do turno aberto (alternativa C) (175.9142ms)
ℹ tests 8
ℹ suites 1
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 610.8314
```

```
cwd: c:\Users\Panificadora S&M\Desktop\PDV_2V\S-M-Panificadora-V2\backend
command: npm.cmd test -- tests/sales/vendas.http.test.js

npm warn Unknown env config "devdir". This will error in a future major version of npm. See `npm help npmrc` for supported config options.
npm notice run test
npm notice run node --test tests/sales/vendas.http.test.js
▶ HTTP /api/vendas
  ✔ POST com turno aberto debita estoque e lança fluxo_caixa (596.6493ms)
  ✔ POST sem turno aberto retorna 403 CAIXA_FECHADO sem escrever nada (106.9273ms)
  ✔ POST com estoque insuficiente não persiste venda nem débitos parciais (112.1331ms)
  ✔ GET /api/vendas é paginado com limite padrão 20 (108.9268ms)
  ✔ DELETE cancela diretamente com turno aberto (103.3011ms)
  ✔ DELETE na mesma venda cancelada é idempotente e não lança segundo estorno (116.8355ms)
  ✔ DELETE com turno fechado cria correcao_pendente; resolver ajusta turno atual (101.1654ms)
✔ HTTP /api/vendas (1253.3472ms)
ℹ tests 7
ℹ suites 1
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3158.0753
```

---

## 5. Revisão de decisão

Em 2026-08-30 o operador rejeitou copiar um “Refund Engine” genérico (alternativa B: gateway, tabela `Refunds`, estorno parcial) e pediu a **alternativa C**: UI no PDV em cima da API que já existia, com confirmação explícita e segundo clique idempotente.

Segunda via do cupom de **venda** ficou combinada para o lado do Estornar (não no Fluxo). Ainda não implementada — ver ISSUE-013 (encomenda, outro papel).
