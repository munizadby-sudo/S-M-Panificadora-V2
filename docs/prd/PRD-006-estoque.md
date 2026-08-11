# PRD-006 — Estoque (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Consulta e lançamento de estoque diário por produto
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-estoque` em `index.html` (`est-kpis`, `est-body`, `busca-est`), funções `renderEstoque`, `updEst`, `zerarEstoquePeriodo` em `app.js`
- **Depende de:** PRD-001, PRD-002, PRD-005 (produto precisa existir antes de ter estoque)

---

## 1. Objetivo

Mostrar ao operador/gerente, para o dia atual, quanto de cada produto está disponível, quanto foi produzido e quanto já foi vendido — e permitir ajustes/lançamentos quando necessário.

---

## 2. Contexto (V1)

- KPIs no topo da tela (`est-kpis`) resumindo situação geral do estoque do dia.
- Tabela por produto (`est-body`) com busca (`busca-est`), permitindo editar valores diretamente (`updEst`).
- Rollover automático do saldo do dia anterior já é tratado no backend — a tela apenas exibe o resultado.
- Função `zerarEstoquePeriodo` sugere existência de uma ação de zerar/reiniciar valores do período.

---

## 3. Requisitos funcionais

- Listagem de estoque do dia por produto: inicial, produzido, vendido, disponível.
- Indicação visual quando o saldo disponível estiver abaixo do mínimo configurado para o produto.
- Edição/lançamento de valores de estoque (upsert), individual e em lote, refletindo o padrão do backend.
- Busca por produto dentro da tela de estoque.
- Exibição clara de que o saldo `disponível` já considera perdas registradas (consequência da correção do backend, PRD Seção 4.4/4.10) — a UI não deve mostrar um número que diverge do que realmente está disponível para venda.

---

## 4. Regras herdadas do V1 (mantidas)

- Rollover automático do dia anterior é transparente para o operador — a tela sempre mostra o estoque "de hoje" já com o saldo herdado.
- Edição individual e em lote.
- KPIs resumidos no topo da tela.

---

## 5. Correções em relação ao V1

- **Saldo disponível deve refletir perdas registradas.** No V1 a tela de estoque não refletia perdas (elas eram um registro paralelo); com a correção no backend, a UI passa a mostrar o número real, evitando a divergência entre "o que a tela diz que tem" e "o que realmente tem".
- Ação de "zerar" período (se mantida) deve ter confirmação explícita e não pode ser uma ação de um clique só, dado o impacto operacional.

---

## 6. Fora de escopo desta fase

- Consulta de estoque histórico (dias anteriores) com detalhamento completo — a tela cobre o dia atual; histórico fica para o módulo de Relatórios (PRD-012).
- Controle de insumos/matéria-prima (ficha técnica) — fora de escopo também no backend nesta fase (ver PRD-007, Produção).

---

## 7. Critérios de aceite

1. O saldo disponível exibido bate com `inicial + produzido − vendido − perdas`.
2. Produto abaixo do mínimo é sinalizado visualmente.
3. Lançamento em lote funciona sem exigir edição produto a produto.
4. A tela sempre reflete o rollover automático do dia, sem exigir ação manual do operador para "começar o dia".
