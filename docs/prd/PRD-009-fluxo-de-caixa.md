# PRD-009 — Fluxo de Caixa (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Lançamentos manuais de entrada/saída e consolidação do fluxo financeiro
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-fluxo` em `index.html` (`fluxo-kpis`, `fluxo-body`, `fluxo-data-filtro`, `fluxo-cat`, `fluxo-desc`, `fluxo-val`, `fluxo-forma`, `setTipoFluxo`, `exportarFluxoCSV`), funções `renderFluxo` em `app.js`
- **Depende de:** PRD-001, PRD-002, PRD-004 (Caixa por Turno)

---

## 1. Objetivo

Permitir lançar entradas e saídas manuais (sangrias, suprimentos, contas) e visualizar o fluxo consolidado, incluindo os lançamentos automáticos gerados por vendas e estornos — sempre com os mesmos números que aparecem no fechamento de turno (PRD-004).

---

## 2. Contexto (V1)

- KPIs resumidos no topo (`fluxo-kpis`).
- Formulário de lançamento manual: tipo (entrada/saída, via `setTipoFluxo`), categoria, descrição, valor, forma.
- Tabela de lançamentos (`fluxo-body`) filtrável por data (`fluxo-data-filtro`).
- Exportação em CSV (`exportarFluxoCSV`).
- No V1, esta tela filtra por **data corrida** (dia inteiro), enquanto o fechamento de turno filtra por `aberto_em` — os dois números podem não bater.

---

## 3. Requisitos funcionais

- Formulário de lançamento manual: tipo (entrada/saída), categoria, descrição, valor, forma de pagamento, vinculado ao turno vigente.
- Listagem de lançamentos com filtro por turno/período (não apenas por data corrida — ver correção abaixo).
- Lançamentos automáticos (venda, estorno) aparecem na listagem, mas sem opção de exclusão para operador comum — apenas `admin` pode excluir, com confirmação explícita.
- Exportação em CSV do período filtrado.
- KPIs no topo sempre coerentes com o filtro aplicado (turno/período selecionado).

---

## 4. Regras herdadas do V1 (mantidas)

- Formulário simples de lançamento manual (tipo, categoria, descrição, valor, forma).
- Exportação CSV.
- Restrição de exclusão de lançamento automático a `admin`.

---

## 5. Correções em relação ao V1

- **Filtro por turno, não apenas por data corrida** — esta é a correção mais importante deste módulo: a tela de Fluxo de Caixa deve usar o mesmo critério do fechamento de turno (`criado_em >= aberto_em` do turno selecionado), eliminando a divergência de números entre as duas telas identificada no V1 (PRD do backend, Seção 4.7 e 6, item 9).
- Exclusão de lançamento automático por `admin` deve exigir confirmação explícita na UI, dado o impacto na conciliação.

---

## 6. Fora de escopo desta fase

- Categorização automática por machine learning/regra avançada — categorias continuam sendo escolhidas manualmente pelo operador.
- Conciliação bancária automática.

---

## 7. Critérios de aceite

1. O total exibido no Fluxo de Caixa para um turno bate exatamente com o total usado no fechamento desse mesmo turno (PRD-004).
2. Lançamento automático não pode ser excluído por operador comum.
3. Exportação CSV reflete exatamente o filtro aplicado na tela.
4. Lançamento manual exige todos os campos obrigatórios antes de salvar.
