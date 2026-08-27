# PRD-018 — Sinal, exceção “paga depois” e troco na encomenda

- **Status:** Aprovado (2026-08-26)
- **Data:** 2026-08-26
- **Módulo:** Encomendas + Fluxo de Caixa (o dinheiro do pedido precisa aparecer na gaveta)
- **Depende de:** PRD-008 (encomendas), PRD-003 (troco do PDV), PRD-009 (fluxo), PRD-004 (esperado do turno)
- **Specs:** SPEC-BE-015, SPEC-FE-019

---

## 1. Objetivo

Fazer o sinal da encomenda bater com o que entra na gaveta, sem obrigar todo cliente a pagar na hora do pedido, e tratar nota grande em dinheiro na entrega do mesmo jeito que o PDV.

---

## 2. Decisões fechadas (não reabrir na spec)

1. **Metade automática é sugestão, não trava.** Ao adicionar/alterar itens, o campo sinal preenche `total / 2`. O operador pode apagar, pôr 0 ou outro valor.
2. **Encomenda não exige sinal.** Sinal 0 é o caso “paga depois” (ex.: cliente que só acerta no fim de semana). Não existe tipo novo (“encomenda avulsa”) — é a mesma encomenda.
3. **Interruptor “Paga depois / sem sinal”** zera o campo e impede a sugestão de metade de sobrescrever. Não precisa de coluna nova no banco neste corte: o que vale é `sinal = 0`.
4. **Sinal > 0 entra no fluxo na criação** (turno aberto + forma), descrição clara de que é sinal. Na entrega entra só o saldo `max(0, total − sinal)`.
5. **Troco só na tela, igual ao PDV.** Nota de R$ 100 para saldo de R$ 50: operador informa recebido 100, sistema mostra troco 50. O fluxo registra **50**, nunca 100. `recebido` não grava no backend.
6. **Marca no cadastro do cliente** (“sempre paga no fim de semana”) fica **fora** deste corte.

---

## 3. Requisitos funcionais

### 3.1 Cadastro / edição

- Com itens no pedido e sem “paga depois” e sem o operador ter editado o sinal na mão, o sinal sugerido é a metade do total (arredondado em centavos).
- “Paga depois / sem sinal” liga → sinal 0, sugestão pausada. Desliga → volta a sugerir metade do total atual.
- Se sinal > 0 na **criação**: exigir caixa aberto e forma (1–4, iguais ao PDV). Se a forma for dinheiro, campo recebido + troco na tela. Sem caixa aberto, mensagem clara (mesmo espírito do receber na entrega).
- Se sinal = 0: criar **não** exige caixa (pode anotar o pedido com a gaveta fechada).

### 3.2 Entrega

- Continua: valor a receber = `max(0, total − sinal)`.
- Forma 1–4. Dinheiro: recebido + troco (cálculo do PDV). Pix/cartão: sem troco.
- Fluxo na entrega: só o saldo. Se o sinal já cobriu o total, só confirma, sem lançamento.

### 3.3 Fluxo de caixa e gaveta

- Dois lançamentos automáticos possíveis no mesmo pedido, ambos `categoria: 'encomenda'`, `gerado_auto: true`, `encomenda_id`:
  - criação, se sinal > 0: valor = sinal
  - entrega, se saldo > 0: valor = saldo
- Reabrir (admin) ou cancelar encomenda **estorna todos** os lançamentos ativos daquele `encomenda_id` (hoje a reabertura só pega um).
- Fechamento do turno continua somando `encomenda` no esperado, agora com sinal e saldo.

---

## 4. Fora de escopo deste corte

- Tipo separado de encomenda avulsa
- Flag persistida no cliente
- Cobrança online
- Ajustar o lançamento do sinal se o operador mudar o valor depois de já ter ido para o caixa (editar sinal já lançado é recusado)
- Estorno automático de “sinal maior que o total novo” além da regra já existente (saldo = 0)

---

## 5. Critérios de aceite

1. Pedido de R$ 10,00: sinal sugere R$ 5,00; dá para pôr 0.
2. “Paga depois” grava sinal 0; na entrega o valor a receber é o total.
3. Criar com sinal R$ 5,00 (dinheiro, recebido 10) lança **R$ 5,00** no fluxo; a tela pode mostrar troco R$ 5,00.
4. Entregar o mesmo pedido lança mais **R$ 5,00** (saldo). Dois lançamentos, total R$ 10,00 no esperado da gaveta.
5. Entregar com saldo R$ 50,00, recebido R$ 100,00: tela mostra troco R$ 50,00; fluxo registra R$ 50,00.
6. Sem caixa aberto, criar com sinal > 0 é bloqueado; criar com sinal 0 continua permitido.
