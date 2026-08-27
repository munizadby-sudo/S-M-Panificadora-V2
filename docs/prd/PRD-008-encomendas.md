# PRD-008 — Encomendas (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Cadastro e acompanhamento de pedidos de clientes
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-encomendas` em `index.html` (`enc-grid`, `modal-enc`, `enc-cliente`, `enc-fone`, `enc-data`, `enc-sinal`, `enc-obs`, `enc-itens-modal`, `setFiltroEnc`), funções `abrirModalEnc`, `abrirEditEnc`, `renderEncomendas`, `addLinhaEnc`, `selecionarProdEnc` em `app.js`
- **Depende de:** PRD-001, PRD-002, PRD-005 (produto), PRD-011 (Clientes — vínculo opcional)
- **Complemento (2026-08-26):** sinal no caixa, “paga depois” e troco — ver `PRD-018-sinal-e-pagamento-encomenda.md`

---

## 1. Objetivo

Permitir registrar pedidos de clientes com itens, acompanhar status (pendente/pronto/entregue) e manter histórico completo, inclusive de encomendas canceladas.

---

## 2. Contexto (V1)

- Grade de encomendas (`enc-grid`) com filtro por status (`setFiltroEnc`).
- Modal de cadastro/edição (`modal-enc`) com dados do cliente (nome, telefone), data de entrega, sinal (adiantamento), observações e itens (`enc-itens-modal`, `addLinhaEnc`, `selecionarProdEnc`).
- Total sempre recalculado a partir dos itens.
- Edição substitui todos os itens (não faz merge incremental).

---

## 3. Requisitos funcionais

- Listagem de encomendas com filtro por status (pendente, pronto, entregue).
- Cadastro/edição: dados do cliente (nome, telefone, e futuramente vínculo com cadastro de Cliente — PRD-011), data de entrega, sinal, observações, itens com produto e quantidade.
- Total exibido na tela é sempre o total recalculado retornado pelo backend, nunca um total calculado apenas no frontend e enviado como se fosse definitivo.
- Status na listagem é um **semáforo** (bolinha + cor), nunca um `<select>` na linha. O ciclo só avança: cadastra → **Pendente** (amarelo) → padeiro marca **Pronto** (verde, dica “Aguardando retirada”) → cliente busca e o operador clica para **Entregar**.
- Entregar abre caixa flutuante para receber o saldo (`max(0, total − sinal)`), com as mesmas formas do PDV (1 Dinheiro / 2 Pix / 3 Débito / 4 Crédito). Em dinheiro, informar o recebido e ver o troco (igual ao PDV); o fluxo registra o saldo, não a nota. Exige caixa aberto. **Não cria venda do PDV** e **não debita estoque** (ADR-002). O recebimento lança `fluxo_caixa` automático `categoria: 'encomenda'`. Se o sinal cobre o total, só confirma a entrega (sem lançamento). Detalhe do sinal na criação e da exceção “paga depois”: PRD-018.
- **Entregue** trava a linha (cinza): sem Editar, Cancelar nem mudança de status. Só o administrador pode **Reabrir** (volta para Pronto e estorna o lançamento).
- Ação de "excluir" encomenda deve ser tratada na UI como cancelamento (soft delete), preservando o registro no histórico — ver correção abaixo. Encomenda já entregue não pode ser cancelada.

---

## 4. Regras herdadas do V1 (mantidas)

- Edição substitui todos os itens do pedido (sem merge incremental).
- Total sempre vem do cálculo do backend.
- Filtro por status na listagem.

---

## 5. Correções em relação ao V1

- **Exclusão de encomenda passa a ser soft delete** na UI (era exclusão física e definitiva no V1) — a ação na tela deve ser rotulada como "cancelar", não "excluir", e a encomenda cancelada deve continuar consultável no histórico.
- Entregar encomenda **não** vira venda do PDV nem mexe em estoque (ADR-002). O dinheiro do saldo entra no turno via `fluxo_caixa` (`categoria: 'encomenda'`), e o fechamento do caixa conta esse valor no esperado da gaveta junto com `vendas` e `estorno`.

---

## 6. Fora de escopo desta fase

- Notificação automática ao cliente (WhatsApp/SMS) sobre status do pedido.
- Cobrança online do sinal/saldo.

---

## 7. Critérios de aceite

1. Cancelar uma encomenda não a remove do histórico/consulta.
2. Total exibido sempre corresponde ao cálculo do backend, nunca diverge do que foi enviado no formulário.
3. Operador só avança Pendente → Pronto; Entregue só acontece pelo receber (modal), nunca por troca livre de status.
4. Edição de itens substitui corretamente a lista anterior, sem duplicar itens.
5. Entregar com saldo > 0 exige caixa aberto e forma; o valor entra no esperado da gaveta (junto com vendas/estorno).
6. Linha Entregue fica travada; só admin reabre.
