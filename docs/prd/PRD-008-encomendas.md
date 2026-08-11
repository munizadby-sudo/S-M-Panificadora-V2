# PRD-008 — Encomendas (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Cadastro e acompanhamento de pedidos de clientes
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-encomendas` em `index.html` (`enc-grid`, `modal-enc`, `enc-cliente`, `enc-fone`, `enc-data`, `enc-sinal`, `enc-obs`, `enc-itens-modal`, `setFiltroEnc`), funções `abrirModalEnc`, `abrirEditEnc`, `renderEncomendas`, `addLinhaEnc`, `selecionarProdEnc` em `app.js`
- **Depende de:** PRD-001, PRD-002, PRD-005 (produto), PRD-011 (Clientes — vínculo opcional)

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
- Ação de mudar status (pendente → pronto → entregue) restrita à whitelist de status válidos.
- Ação de "excluir" encomenda deve ser tratada na UI como cancelamento (soft delete), preservando o registro no histórico — ver correção abaixo.

---

## 4. Regras herdadas do V1 (mantidas)

- Edição substitui todos os itens do pedido (sem merge incremental).
- Total sempre vem do cálculo do backend.
- Filtro por status na listagem.

---

## 5. Correções em relação ao V1

- **Exclusão de encomenda passa a ser soft delete** na UI (era exclusão física e definitiva no V1) — a ação na tela deve ser rotulada como "cancelar", não "excluir", e a encomenda cancelada deve continuar consultável no histórico.
- Se a decisão de produto (PRD do backend, Seção 4.9) for de que encomendas passam a debitar/reservar estoque, a tela deve comunicar claramente ao operador quando um item da encomenda não tiver estoque suficiente — comportamento a confirmar junto com essa decisão de backend.

---

## 6. Fora de escopo desta fase

- Notificação automática ao cliente (WhatsApp/SMS) sobre status do pedido.
- Cobrança online do sinal/saldo.

---

## 7. Critérios de aceite

1. Cancelar uma encomenda não a remove do histórico/consulta.
2. Total exibido sempre corresponde ao cálculo do backend, nunca diverge do que foi enviado no formulário.
3. Mudança de status só aceita valores da whitelist definida.
4. Edição de itens substitui corretamente a lista anterior, sem duplicar itens.
