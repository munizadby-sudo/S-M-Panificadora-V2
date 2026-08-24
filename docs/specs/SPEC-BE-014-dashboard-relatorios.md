# SPEC-BE-014 — Dashboard de Relatórios

- **Status:** Rascunho para revisão
- **Data:** 2026-08-23
- **Módulo:** `src/modules/reports` (extensão) + `src/modules/sales` (extensão de porta existente)
- **Depende de:** SPEC-BE-007 (Vendas/`venda_itens`), SPEC-BE-012 (Relatórios — reaproveita a mesma fonte de dados e o mesmo módulo `reports`)
- **PRD de origem:** `PRD-017-dashboard-de-vendas-e-fluxo.md`

---

## 1. Objetivo técnico

Estender o relatório de Vendas já existente (SPEC-BE-012, Seção 4.1) com os números que faltam para os KPIs do dashboard (itens vendidos, número de vendas, ticket médio) e adicionar **um** relatório novo, só-leitura, de vendas agregadas por hora — para alimentar o gráfico "Vendas por Hora" do PRD-017.

Nenhuma tabela nova. Nenhuma escrita. Reaproveita a mesma fonte de dado que `RelatorioVendas` e `CurvaABCProdutos` já usam (`VendaRepository.listarItensConfirmadosNoPeriodo`), estendida com um campo adicional — não cria uma segunda consulta ao banco para o mesmo dado.

O dashboard do módulo Fluxo de Caixa (PRD-017, Seção 3.2) **não precisa de nenhuma mudança de backend** — já consome `GET /api/fluxo-caixa/resumo` (SPEC-BE-008, Seção 5.4), que já entrega os totais agregados corretamente. Esta spec cobre só a parte de Relatórios.

---

## 2. Extensão na interface de repositório existente

### 2.1 `VendaRepository.listarItensConfirmadosNoPeriodo` (SPEC-BE-007) — adiciona campo `horaOperacao`

Contrato atual (SPEC-BE-012, Seção 2.1) devolve, por item: `vendaId, produtoId, produtoNome, quantidade, precoUnitario, subtotal, formaPagamento, dataOperacao`.

Adicionar `horaOperacao: number` (0–23) a cada item — a hora civil, no mesmo fuso `America/Recife` já usado para calcular `dataOperacao` (mesma função `Intl.DateTimeFormat` com `timeZone: 'America/Recife'`, adicionando `hour: '2-digit', hourCycle: 'h23'`). É um campo **aditivo**: nenhum consumidor existente (`RelatorioVendas`, `CurvaABCProdutos`) precisa mudar, só passa a ignorar o campo novo.

Atualizar:
- `backend/src/modules/sales/application/ports.js` — comentário do contrato (`@returns`).
- `backend/src/modules/sales/infrastructure/MySQLVendaRepository.js` — `listarItensConfirmadosNoPeriodo`, adicionar `horaOperacao` calculado a partir de `linha.criado_em`, ao lado de `dataOperacao`.
- `backend/tests/helpers/MemoriaVendaRepository.js` — mesmo campo, derivado de `venda.criadoEm`/`venda.dataOperacao()` (usar a mesma lógica de fuso já usada por `dataOperacao()` na entidade `Venda`, não duplicar cálculo de fuso em outro lugar).

---

## 3. Camada de domínio (`src/modules/reports/domain`)

### 3.1 `agruparPorHora(itens[])` (nova função pura)

Recebe os itens de `listarItensConfirmadosNoPeriodo` (já com `horaOperacao`). Regras:

1. Se `itens` estiver vazio, retorna `[]` — **não** inventa um intervalo de horas vazio.
2. Agrupa por `horaOperacao`, somando `quantidade` e `subtotal` (como `receita`) de cada hora.
3. Determina `horaMin` e `horaMax` a partir das horas **realmente presentes** nos dados — nunca uma faixa fixa no código (correção do PRD-017, Seção 5, sobre a faixa 6h–19h hardcoded do V1).
4. Preenche com zero (`quantidade: 0, receita: 0`) toda hora entre `horaMin` e `horaMax` que não teve venda — para o gráfico mostrar corretamente um intervalo sem vendas no meio do expediente (ex.: hora de almoço), em vez de "pular" a barra.
5. Retorna a lista ordenada por `hora` crescente: `{ hora: number, quantidade: number, receita: number }[]`.

Função pura, testável sem banco (mesmo padrão de `classificarCurvaABC`, SPEC-BE-012 Seção 3.1).

---

## 4. Camada de aplicação (`src/modules/reports/application`)

### 4.1 `RelatorioVendas({ data_inicio, data_fim })` — estender o retorno existente

Sem mudar a consulta (mesma fonte de dado já usada), adicionar ao objeto de retorno já existente:
- `quantidade_itens` — soma de `quantidade` de todos os itens do período.
- `numero_vendas` — contagem de `vendaId` **distintos** no período (não confundir com número de itens — uma venda pode ter vários itens).
- `ticket_medio` — `total_geral / numero_vendas`, arredondado como dinheiro (`dinheiro()`, já usado no restante do módulo). Se `numero_vendas` for 0, retorna `0` (não `NaN`/`Infinity`).

Os três campos existentes (`total_geral`, `por_forma_pagamento`, `por_produto`) **não mudam**.

### 4.2 `RelatorioVendasPorHora({ data_inicio, data_fim })` (novo caso de uso)

1. Valida o período com `validarPeriodo` (mesma função já usada pelos outros 4 relatórios — `PeriodoInvalidoError` se `data_inicio > data_fim`).
2. `itens = VendaRepository.listarItensConfirmadosNoPeriodo(dataInicio, dataFim)` — **mesma chamada** já usada por `RelatorioVendas`/`CurvaABCProdutos`, não uma consulta nova.
3. Retorna `{ por_hora: agruparPorHora(itens) }`.

---

## 5. Contratos de API

### 5.1 `GET /api/relatorios/vendas` — resposta estendida

```json
{
  "total_geral": 4520.00,
  "quantidade_itens": 812,
  "numero_vendas": 96,
  "ticket_medio": 47.08,
  "por_forma_pagamento": [
    { "forma_pagamento": "dinheiro", "total": 2100.00 }
  ],
  "por_produto": [
    { "produto": "Pão Francês", "quantidade": 320, "receita": 480.00 }
  ]
}
```
(Campos `por_forma_pagamento`/`por_produto` omitidos parcialmente acima só por brevidade — contrato completo é o mesmo da SPEC-BE-012, Seção 5.1, mais os 3 campos novos.)

### 5.2 `GET /api/relatorios/vendas-por-hora` (endpoint novo)

Requer token + permissão `rel` (mesma permissão dos outros 4 relatórios). Mesma query obrigatória `?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD`.

```json
{
  "por_hora": [
    { "hora": 7, "quantidade": 12, "receita": 96.00 },
    { "hora": 8, "quantidade": 34, "receita": 210.50 },
    { "hora": 9, "quantidade": 0, "receita": 0 }
  ]
}
```

| Status | Quando |
|---|---|
| 400 | `data_inicio`/`data_fim` ausentes, malformadas, ou `data_inicio > data_fim` (mesma regra dos outros 4 relatórios) |

`RelatoriosController` ganha um método `vendasPorHora(req, res, next)` seguindo exatamente o mesmo padrão dos outros 4 métodos já existentes (try/catch → `next(erro)`). Rota registrada em `app.js`/`bootstrap.js` do mesmo jeito que as demais rotas de `/api/relatorios/*`.

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Cálculo de KPIs (receita, itens, ticket médio) | Somado no frontend a partir de todas as vendas do período, sem paginação, direto do navegador | Agregado no backend, mesmo padrão dos outros 4 relatórios já existentes |
| Vendas por hora | Faixa fixa 6h–19h no código do frontend; venda fora da faixa some do gráfico mas conta no KPI | Faixa sempre derivada das horas com venda reais no período; nenhuma venda fica de fora do gráfico |
| KPI "Descontos" | Existia (card sempre vazio — nunca foi implementado) | Não existe — V2 não tem conceito de desconto em venda (fora de escopo, PRD-017 Seção 6) |

---

## 7. Critérios de aceite técnicos

1. `ticket_medio` nunca é `NaN`/`Infinity`/negativo — período sem venda retorna `0`.
2. `numero_vendas` conta vendas distintas, não itens — uma venda com 5 itens conta 1, não 5.
3. `quantidade_itens` de `RelatorioVendas` bate exatamente com a soma de `quantidade` de todos os produtos em `por_produto` do mesmo período.
4. `GET /api/relatorios/vendas-por-hora` nunca tem uma faixa de hora fixa no código-fonte — testável garantindo que uma venda registrada fora de qualquer faixa "óbvia" (ex.: às 23h) aparece no resultado.
5. Soma de `receita` de todas as horas em `por_hora` bate exatamente com `total_geral` de `RelatorioVendas` para o mesmo período (mesma fonte de dado).
6. Período sem nenhuma venda confirmada retorna `{ "por_hora": [] }` — nunca um array de 24 horas zeradas.
7. `data_inicio` posterior a `data_fim` retorna 400 em `vendas-por-hora`, igual aos outros 4 relatórios.
8. Extensão de `listarItensConfirmadosNoPeriodo` com `horaOperacao` não quebra nenhum teste existente de `RelatorioVendas`, `RelatorioFechamentoCaixa`, `CurvaABCProdutos` ou `RelatorioResultado` — campo é aditivo.
