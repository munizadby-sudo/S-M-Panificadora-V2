# PRD-017 — Dashboard de Vendas e Fluxo (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-23
- **Módulo:** Camada visual de indicadores (KPIs) e gráficos sobre Relatórios e Fluxo de Caixa
- **Referência/legado:** `S-M-Panificadora` (V1) — aba "Relatórios" → "Dashboard de Vendas" (`frontend/index.html`, `app.js` função `_drawRel`) e aba "Fluxo" (`renderFluxo`)
- **Depende de:** PRD-009 (Fluxo de Caixa), PRD-012 (Relatórios), PRD-016 (Redesign de Interface — tokens visuais)

---

## 1. Objetivo

Dar ao dono/gerente uma leitura rápida ("de relance") do desempenho do dia/período, sem precisar interpretar tabelas — complementando (não substituindo) os relatórios detalhados que já existem. É a mesma necessidade que o V1 tentava atender com seu "Dashboard de Vendas", só que corrigindo os problemas técnicos que ele tinha.

---

## 2. Contexto (V1)

O V1 tinha, dentro da aba Relatórios, uma seção "Dashboard de Vendas" com: 4 cards de KPI (Receita Total, Itens Vendidos, Ticket Médio, Descontos), um gráfico de barras "Vendas por Hora", um gráfico de barras horizontais "Por Forma de Pagamento" e uma lista "Top 5 Produtos" — tudo em CSS/HTML puro, sem biblioteca de gráficos externa. A aba "Fluxo" tinha 3 KPIs (Entradas, Saídas, Saldo do Dia).

Auditoria do código do V1 (2026-08-23) encontrou os seguintes problemas concretos, que esta fase corrige:

1. Todo o cálculo dos KPIs e gráficos era feito **no navegador**, somando os dados brutos de vendas trazidos sem agregação do backend.
2. A tela de Fluxo somava apenas a **primeira página** de uma listagem paginada (limite de 25) para calcular Entradas/Saídas/Saldo — em dias com mais de 25 lançamentos, os números ficavam errados **sem nenhum aviso visual**.
3. O gráfico "Vendas por Hora" usava uma janela de horário fixa (6h–19h) — vendas fora dessa faixa entravam na soma dos cards mas desapareciam do gráfico.
4. Existia um card ("Resumo") que nunca era preenchido — ficava sempre vazio.
5. Nenhuma dessas telas tinha teste automatizado.

---

## 3. Requisitos funcionais

### 3.1 Dashboard em Relatórios
- Cards de KPI no topo da tela, acima dos relatórios detalhados já existentes (Vendas, Fechamento, Curva ABC, Resultado), respeitando o mesmo filtro de período já usado por eles:
  - Receita total do período.
  - Quantidade de itens vendidos no período.
  - Ticket médio (receita total ÷ número de vendas do período).
- Gráfico de barras "Vendas por Hora" — mostrando volume de vendas ao longo do dia/período, cobrindo **exatamente as horas em que houve venda** (sem faixa fixa pré-definida).
- Gráfico de barras "Por Forma de Pagamento" — mesma informação que já existe na tabela "Por forma de pagamento" do relatório de Vendas, só que em formato visual.
- Lista "Top 5 Produtos" — os 5 produtos de maior receita no período, com barra proporcional.
- As tabelas detalhadas que já existem continuam exatamente como estão, abaixo do dashboard — o dashboard complementa, não substitui, a visão de auditoria/exportação.

### 3.2 Dashboard em Fluxo de Caixa
- Cards de KPI no topo da tela: Entradas do turno, Saídas do turno, Líquido do turno — usando os mesmos dados já agregados que hoje alimentam a tabela de resumo por forma de pagamento.
- Tabela de detalhe por forma de pagamento (Dinheiro/Pix/Cartão) continua existindo abaixo, como hoje.

### 3.3 Sem funcionalidade nova de negócio
Nenhum requisito desta fase cria uma nova regra de cálculo de venda, caixa ou fluxo — é sempre uma nova forma de exibir números que o sistema já calcula (ou uma pequena extensão de um cálculo já existente, como ticket médio).

---

## 4. Regras herdadas do V1 (mantidas)

- Layout de cards de KPI + gráficos de barra, sem biblioteca externa de gráficos (mesma decisão técnica do V1, que era acertada — mantém a Fundação offline-first, ver ADR-003).
- Ideia de destacar "Top 5 Produtos" como lista visual, não só tabela.

---

## 5. Correções em relação ao V1

| Problema no V1 | Correção nesta fase |
|---|---|
| KPIs/gráficos calculados no navegador a partir de dados brutos | Todo número exibido vem de um endpoint que já entrega o dado agregado (extensão dos relatórios existentes, SPEC-BE-012) |
| Fluxo somava só a 1ª página de uma lista paginada | Dashboard de Fluxo usa o endpoint de resumo já agregado no backend, que nunca teve esse problema |
| Faixa de horário fixa (6h–19h) no gráfico de vendas por hora | Faixa é sempre derivada das horas com venda no período — sem valor fixo no código |
| Card "Resumo" nunca preenchido | Todo elemento visual criado nesta fase é coberto por teste que confirma que ele recebe dado real — nenhum card "decorativo" sem fonte de dados |
| Zero teste na lógica de dashboard | Cobertura de teste obrigatória, mesmo padrão já aplicado a todos os outros módulos da V2 |

---

## 6. Fora de escopo desta fase

- KPI de "Descontos" do V1 — a V2 não tem conceito de desconto em venda; não é uma correção, é uma funcionalidade que não existe (ficaria para um PRD de Vendas separado, se um dia for decidido implementar desconto).
- Gráficos de série temporal multi-dia (comparativo entre períodos, tendência) — só o período já filtrado.
- Qualquer dashboard preditivo ou de outros módulos (Estoque, Produção, Encomendas) — só Relatórios e Fluxo de Caixa nesta fase.
- Impressão/exportação do dashboard em si (as tabelas de detalhe já exportam CSV; os cards e gráficos são só visuais).

---

## 7. Critérios de aceite

1. Os 3 KPIs de Relatórios (Receita, Itens, Ticket Médio) batem exatamente com os números já existentes nas tabelas de detalhe do mesmo período (mesma fonte de dado).
2. O gráfico "Vendas por Hora" nunca omite uma venda real da soma — toda hora com venda aparece no gráfico, nenhuma faixa fixa esconde dado.
3. Os KPIs de Fluxo (Entradas/Saídas/Líquido) batem com a soma das 3 formas de pagamento já exibidas na tabela de resumo do turno.
4. Nenhum card ou gráfico aparece vazio/quebrado quando não há dado no período — mostra estado vazio claro, igual ao padrão já usado no resto do sistema (PRD-016, Seção 3.9).
5. Nenhuma dependência externa (CDN, biblioteca de gráfico) é adicionada — mesma restrição já validada em ADR-003.
