# PRD-012 — Relatórios (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Relatórios gerenciais de vendas, caixa e produtos
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-rel` em `index.html` (`rel-kpis`, `rel-body`, `rel-data-ini`, `rel-data-fim`, `exportarCSV`), funções `_drawRel`, `setRelHoje` em `app.js`
- **Depende de:** PRD-001, PRD-002. Consome dados de Vendas, Caixa, Estoque e Fluxo.

---

## 1. Objetivo

Dar visibilidade gerencial sobre o desempenho da padaria: o que vendeu, quanto, em que forma de pagamento, e como fechou o caixa — para apoiar decisão do dono/gerente, não só operação do dia a dia.

---

## 2. Contexto (V1)

- Tela com KPIs (`rel-kpis`), filtro por intervalo de datas (`rel-data-ini`, `rel-data-fim`, atalho `setRelHoje`), tabela de dados (`rel-body`) e exportação CSV (`exportarCSV`).
- No V1, é essencially uma listagem bruta de dados, sem relatórios gerenciais propriamente ditos (curva ABC, resultado consolidado) — o PRD do backend (Seção 4.15) já prevê a ampliação desses relatórios.

---

## 3. Requisitos funcionais

- Filtro por intervalo de datas, com atalho para "hoje".
- Relatório de vendas por período: total, por forma de pagamento, por produto.
- Relatório de fechamento de caixa por turno/período (consolidando dados do PRD-004).
- Curva ABC de produtos (mais vendidos por receita e por quantidade).
- Relatório simplificado de resultado (entradas − saídas) por período.
- Exportação em CSV de qualquer relatório exibido.

---

## 4. Regras herdadas do V1 (mantidas)

- Filtro por intervalo de datas com atalho para "hoje".
- Exportação CSV.

---

## 5. Correções em relação ao V1

- Ampliação de listagem bruta para relatórios gerenciais de fato (curva ABC, resultado consolidado), conforme escopo definido no backend (PRD do backend, Seção 4.15) — o V1 tinha apenas dados brutos, sem essa camada de análise.
- Consulta de vendas por período deve ser paginada no backend (correção do PRD do backend, Seção 4.6); a tela de relatórios deve lidar corretamente com paginação para intervalos grandes, sem travar ao carregar meses de dados.

---

## 6. Fora de escopo desta fase

- DRE contábil formal — mesmo escopo excluído no PRD do backend, Seção 4.15.
- Exportação para sistema contábil externo.
- Dashboards preditivos (previsão de demanda).

---

## 7. Critérios de aceite

1. Filtro por período funciona corretamente para todos os relatórios da tela.
2. Curva ABC reflete corretamente os produtos mais vendidos por receita e por quantidade.
3. Exportação CSV reflete exatamente o que está sendo exibido na tela.
4. Consulta de um intervalo grande (ex.: 3 meses) não trava a tela — paginação/carregamento incremental tratado corretamente.
