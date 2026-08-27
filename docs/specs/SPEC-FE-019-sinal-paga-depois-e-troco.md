# SPEC-FE-019 — Sinal sugerido, paga depois e troco na encomenda

- **Status:** Aprovada e implementada (2026-08-26)
- **Data:** 2026-08-26
- **Módulo:** `frontend/src/modules/encomendas`
- **Depende de:** SPEC-FE-011 (form + finalizar), SPEC-FE-007 (`calcularTroco` / recebido do PDV), SPEC-BE-015 (criar com `forma` e caixa quando sinal > 0)
- **PRD de origem:** `PRD-018-sinal-e-pagamento-encomenda.md`
- **Não muda:** semáforo de status, cancelar vs excluir, “não vira venda do PDV”

---

## 0. Ordem

Implementar **depois** (ou em paralelo a partir do Passo 4) da SPEC-BE-015. Os Passos 1–3 desta spec **não** dependem de API nova.

---

## 1. Objetivo técnico

No formulário: sugerir metade, permitir zero (paga depois). Na criação com sinal e na entrega: forma 1–4 e, se dinheiro, recebido + troco iguais ao PDV. O POST só envia `sinal` e `forma` — nunca o valor da nota.

---

## 2. Funções puras (contrato)

```js
sugerirSinalMetade(total)           // metade em centavos; total 10 → 5; total 0 → 0
aplicarSinalDoFormulario({
  total,
  sinalAtual,
  pagaDepois,                       // boolean
  sinalEditadoNaMao,                // boolean — input do campo sinal
})
// pagaDepois → '0'
// senão se sinalEditadoNaMao → sinalAtual (não pisa)
// senão → sugerirSinalMetade(total)

saldoAReceber(encomenda)            // já existe; não mudar a fórmula
```

Reusar `calcularTroco(recebido, valorACobrar)` de `pdv/pagamento.js` (o segundo argumento é o saldo ou o sinal, não o total do pedido se já houve sinal).

---

## 3. Passos (cada um testável sozinho)

Não começar o passo seguinte sem o canário do anterior verde.

### Passo 1 — Metade e trava, sem DOM de modal

Arquivo novo enxuto (ex.: `encomendas/sinal.js`) com `sugerirSinalMetade` e `aplicarSinalDoFormulario`.

- **Testável:** `frontend/tests/encomendas/` — casos 10→5, 0→0, `pagaDepois` força 0 mesmo com total 10, `sinalEditadoNaMao` preserva 7 com total 10.

### Passo 2 — Ligar a sugestão no formulário de nova encomenda

Ao adicionar/remover item, se não estiver em edição de sinal na mão e “paga depois” estiver off, `estado.formulario.sinal` recebe a metade.

Interruptor **Paga depois / sem sinal** (`#encomenda-paga-depois`): liga → sinal `0` e `sinalEditadoNaMao` irrelevante (pagaDepois manda); desliga → limpa a trava e reaplica metade.

Digitação no `#encomenda-sinal` marca `sinalEditadoNaMao`.

Não precisa persistir o interruptor: ao reabrir edição, se `sinal === 0` o interruptor pode nascer desligado (campo 0 já é paga depois na prática). Não inferir “ligado” só pelo zero — o operador vê o campo.

- **Testável:** com o módulo de estado/form (ou teste de função que o `index.js` chama ao mudar itens). Assert de HTML: existe `#encomenda-paga-depois`.

### Passo 3 — Troco no modal de finalizar (só frontend)

Se forma = `dinheiro` e saldo > 0: mostrar `#encomenda-recebido` e linha de troco (`atualizarTrocoNoDom` do PDV ou cópia mínima no modal). Confirmar entrega só se recebido ≥ saldo (mesma regra de `podeConfirmarVenda`).

POST continua `{ forma }` — **não** manda recebido.

Pix/débito/crédito: esconde recebido.

- **Testável:** `htmlModalFinalizarEncomenda` com forma dinheiro contém o campo recebido; com pix, não. Função `podeConfirmarEntrega({ saldo, forma, recebido })` espelha o PDV.

### Passo 4 — Forma e troco na **criação** quando sinal > 0 (depende BE-015)

No modal nova encomenda, se sinal > 0: bloco de formas 1–4 (reusar `formaPeloAtalho` / botões do finalizar). Dinheiro: recebido contra o **sinal** (não contra o total).

`validarFormularioEncomenda` exige `forma` se sinal > 0. POST inclui `forma`.

Caixa fechado: mostrar a mensagem do backend (“Abra o caixa para receber o sinal.”) sem criar o pedido.

Sinal 0: não pede forma, não pede caixa.

Edição: se o backend recusar mudança de sinal (400), mostrar a mensagem de negócio. Não inventar lançamento no cliente.

- **Testável:** validação local sinal 5 sem forma → erro; sinal 0 sem forma → ok. Fonte do POST contém `forma` quando sinal > 0.

### Passo 5 — Conferência no browser (não automatizada)

Checklist:

- [ ] Itens somam 10, sinal vira 5 sozinho
- [ ] Paga depois zera; entrega cobra 10
- [ ] Criar com sinal 5, dinheiro, recebido 10 → fluxo mostra entrada 5
- [ ] Entregar → segunda entrada 5
- [ ] Entregar saldo 50, recebido 100 → tela troco 50; fluxo 50
- [ ] Caixa fechado + sinal 5 → não salva; caixa fechado + sinal 0 → salva

---

## 4. Fora de escopo

- Flag no cadastro do cliente
- Segundo tipo de encomenda
- Mandar `recebido` na API
- Sugerir metade no PDV

---

## 5. Critérios de aceite

1. Metade e “paga depois” cobertos por teste puro (Passo 1) antes de qualquer HTML extra.
2. Finalizar em dinheiro calcula troco sobre o **saldo**, não sobre o total do pedido.
3. Criação com sinal > 0 envia `forma`; fluxo (backend) recebe o sinal, não a nota.
4. `sem_impressao` / comprovante de caixa não entram nesta spec.
5. Passos 1→4 com canário verde isolado; Passo 5 conferido na loja.
