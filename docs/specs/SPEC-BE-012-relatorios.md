# SPEC-BE-012 — Relatórios

- **Status:** Rascunho para revisão
- **Data:** 2026-08-22
- **Módulo:** `src/modules/reports`
- **Depende de:** ADR-001, SPEC-BE-001 (RBAC — permissão `rel`, já na whitelist), SPEC-BE-002 (Caixa por Turno — reaproveita `esperado`/`contado`/`diferença` já persistidos no fechamento, e a fórmula de `status_resumo`), SPEC-BE-007 (Vendas/`venda_itens`), SPEC-BE-008 (Fluxo de Caixa)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.15; `PRD-012-relatorios.md` (frontend)

---

## 1. Objetivo técnico

Especificar 4 relatórios gerenciais, **todos somente leitura** — este módulo não cria tabela própria, não tem entidade persistida, e não escreve em nada. Consome dados já existentes de Vendas, Caixa por Turno e Fluxo de Caixa, através das interfaces de repositório desses módulos (estendidas aqui com os métodos de agregação que faltavam), nunca lendo a tabela de outro módulo diretamente sem passar pela interface dele.

**Nota de escopo — exportação CSV:** mesma decisão já registrada na SPEC-BE-008, Seção 6 — exportação é responsabilidade do frontend, gerada a partir dos dados que os endpoints abaixo já retornam. Nenhum endpoint de exportação faz parte desta spec.

---

## 2. Extensões nas interfaces de repositório existentes

Nenhuma tabela nova. Cada método abaixo é adicionado à interface do módulo dono da tabela — Relatórios consome essas interfaces, nunca faz `SELECT` direto em tabela de outro módulo.

### 2.1 `VendaRepository` (SPEC-BE-007) — novo método
```text
listarItensConfirmadosNoPeriodo(dataInicio, dataFim): {
  vendaId, produtoId, produtoNome, quantidade, precoUnitario, subtotal,
  formaPagamento, dataOperacao
}[]
```
Junta `vendas` (`status = 'confirmada'`) com `venda_itens` e `produtos`. O filtro de período usa a **mesma noção de `dataOperacao()`** já definida na entidade `Venda` (fuso `America/Recife`, não corte de string UTC — SPEC-BE-007, Seção 3.1) — a query traz uma faixa um pouco mais ampla em UTC e a filtragem exata por dia civil é feita em memória, reaproveitando `dataOperacao()`, para não duplicar a lógica de fuso em SQL.

### 2.2 `CaixaTurnoRepository` (SPEC-BE-002) — novo método
```text
listarFechadosNoPeriodo(dataInicio, dataFim): CaixaTurno[]
```
`WHERE status = 'fechado' AND data BETWEEN ? AND ?`. Cada `CaixaTurno` já carrega `esperado`/`contado`/`diferenca` persistidos no fechamento (SPEC-BE-002, Seção 2.1) — nenhum recálculo.

### 2.3 `FluxoCaixaRepository` (SPEC-BE-008) — novo método
```text
listarAtivosNoPeriodo(dataInicio, dataFim): LancamentoFluxoCaixa[]
```
`WHERE ativo = 1 AND data BETWEEN ? AND ?` — **sem** filtro de `turno_id` nem de `categoria` (diferente do `agregarEntradasSaidasPorTurno` da SPEC-BE-002, que é por turno; este é por período corrido, cruzando turnos, para o relatório de Resultado).

---

## 3. Camada de domínio (`src/modules/reports/domain`)

Só funções puras de cálculo — sem entidade persistida.

### 3.1 `classificarCurvaABC(itens[])`
Recebe itens já com `receita` calculada, ordena por `receita` desc, calcula o percentual acumulado e classifica:
```text
A: percentual acumulado até 80%
B: percentual acumulado até 95%
C: percentual acumulado acima de 95%
```
Retorna a mesma lista, ordenada, com `classe` (`'A' | 'B' | 'C'`) e `percentual_acumulado` adicionados a cada item. Função pura, testável sem banco.

### 3.2 `calcularStatusResumo(diferencaTotal)`
Reaproveitada conceitualmente da `FechamentoCaixa` (SPEC-BE-002, Seção 3.2) — não recalcula a diferença (já persistida), só deriva o rótulo a partir do sinal:
```text
diferencaTotal === 0 → 'bateu certo'
diferencaTotal > 0   → 'sobra'
diferencaTotal < 0   → 'falta'
```

### 3.3 Exceções de domínio
- `PeriodoInvalidoError` (400) — `data_inicio` posterior a `data_fim`, ou datas ausentes/malformadas.

---

## 4. Camada de aplicação (`src/modules/reports/application`)

Todos os casos de uso recebem `{ data_inicio, data_fim }` e validam `data_inicio <= data_fim` antes de qualquer consulta (`PeriodoInvalidoError` se inválido).

### 4.1 `RelatorioVendas({ data_inicio, data_fim })`
1. `itens = VendaRepository.listarItensConfirmadosNoPeriodo(data_inicio, data_fim)`.
2. Agrega:
   - `total_geral` — soma de todos os `subtotal`.
   - `por_forma_pagamento` — soma de `subtotal` agrupada por `formaPagamento` (agregação feita a partir dos itens já trazidos, já que cada item carrega a forma de pagamento da venda a que pertence).
   - `por_produto` — para cada produto: `produto`, `quantidade` (soma), `receita` (soma de `subtotal`), ordenado por receita desc.
3. Retorna os três blocos.

### 4.2 `RelatorioFechamentoCaixa({ data_inicio, data_fim })`
1. `turnos = CaixaTurnoRepository.listarFechadosNoPeriodo(data_inicio, data_fim)`.
2. Para cada turno: `{ id, data, periodo, esperado, contado, diferenca, status_resumo: calcularStatusResumo(diferenca.total) }`.
3. Resumo do período: soma de `esperado.total`/`contado.total`/`diferenca.total` de todos os turnos listados (soma simples, os totais por forma já vêm calculados por turno).
4. Retorna `{ turnos: [...], resumo_periodo: {...} }`.

### 4.3 `CurvaABCProdutos({ data_inicio, data_fim })`
1. `itens = VendaRepository.listarItensConfirmadosNoPeriodo(data_inicio, data_fim)` (mesma fonte do 4.1 — reaproveita a mesma consulta, não duplica).
2. Agrega por produto: `quantidade` (soma), `receita` (soma de `subtotal`).
3. `porReceita = classificarCurvaABC(itens agregados)` — ordenado por receita, com classe A/B/C.
4. `porQuantidade` — mesma lista de produtos agregados, ordenada por `quantidade` desc, **sem** reclassificar ABC por quantidade (a classificação ABC é sempre por receita — a ordenação por quantidade é só um ranking auxiliar, sem letra).
5. Retorna `{ por_receita: [...com classe...], por_quantidade: [...sem classe...] }`.

### 4.4 `RelatorioResultado({ data_inicio, data_fim })`
1. `lancamentos = FluxoCaixaRepository.listarAtivosNoPeriodo(data_inicio, data_fim)`.
2. `total_entradas = Σ valor onde tipo='entrada'`; `total_saidas = Σ valor onde tipo='saida'`.
3. `por_categoria` — para cada categoria (`vendas`, `estorno`, `sangria`, `suprimento`, etc.): `{ categoria, entradas, saidas }`.
4. `resultado = total_entradas - total_saidas`.
5. Retorna `{ total_entradas, total_saidas, resultado, por_categoria: [...] }`.

**Nota importante:** este resultado **não é** o mesmo cálculo do "esperado" de fechamento de caixa (SPEC-BE-002) nem do resumo por turno (SPEC-BE-008) — inclui todas as categorias, cruza turnos, e é filtrado por período corrido, não por turno. Os três números têm propósitos diferentes e não precisam bater, mesma lógica já registrada na SPEC-BE-008, Seção 4.4.

---

## 5. Contratos de API

Todos exigem token + permissão `rel`. Todos usam a mesma query obrigatória `?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD`.

### 5.1 `GET /api/relatorios/vendas`
```json
{
  "total_geral": 4520.00,
  "por_forma_pagamento": [
    { "forma_pagamento": "dinheiro", "total": 2100.00 },
    { "forma_pagamento": "pix", "total": 1800.00 },
    { "forma_pagamento": "cartao", "total": 620.00 }
  ],
  "por_produto": [
    { "produto": "Pão Francês", "quantidade": 320, "receita": 480.00 }
  ]
}
```

### 5.2 `GET /api/relatorios/fechamento-caixa`
```json
{
  "turnos": [
    { "id": 12, "data": "2026-08-11", "periodo": "tarde", "esperado": { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 }, "contado": { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 }, "diferenca": { "dinheiro": 0, "pix": 0, "cartao": 0, "total": 0 }, "status_resumo": "bateu certo" }
  ],
  "resumo_periodo": { "esperado_total": 678.50, "contado_total": 678.50, "diferenca_total": 0 }
}
```

### 5.3 `GET /api/relatorios/curva-abc`
```json
{
  "por_receita": [
    { "produto": "Pão Francês", "quantidade": 320, "receita": 480.00, "percentual_acumulado": 42.1, "classe": "A" }
  ],
  "por_quantidade": [
    { "produto": "Pão Francês", "quantidade": 320, "receita": 480.00 }
  ]
}
```

### 5.4 `GET /api/relatorios/resultado`
```json
{
  "total_entradas": 4520.00,
  "total_saidas": 340.00,
  "resultado": 4180.00,
  "por_categoria": [
    { "categoria": "vendas", "entradas": 4520.00, "saidas": 0 },
    { "categoria": "sangria", "entradas": 0, "saidas": 340.00 }
  ]
}
```

**Erro comum aos 4 endpoints**
| Status | Quando |
|---|---|
| 400 | `data_inicio`/`data_fim` ausentes, malformadas, ou `data_inicio > data_fim` |

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Relatórios gerenciais | Listagem bruta (`rel-body`), sem agregação | 4 relatórios agregados: vendas, fechamento de caixa, curva ABC, resultado |
| Curva ABC | Inexistente | Classificação A/B/C por percentual acumulado de receita |
| Exportação CSV | Server-side | Responsabilidade do frontend (mesma decisão da SPEC-BE-008) |

---

## 7. Critérios de aceite técnicos

1. `data_inicio` posterior a `data_fim` retorna 400 nos 4 endpoints, antes de qualquer consulta ao banco.
2. `RelatorioVendas` nunca conta venda `cancelada` no total nem no breakdown por produto.
3. Uma venda feita perto da meia-noite (fuso `America/Recife`) é contabilizada no dia civil correto, mesma regra de `dataOperacao()` da SPEC-BE-007 — não no dia UTC.
4. A soma de `receita` de todos os produtos na curva ABC bate exatamente com `total_geral` do `RelatorioVendas` para o mesmo período (mesma fonte de dados).
5. Classe `A` da curva ABC nunca ultrapassa 80% acumulado; produto que cruza esse limiar entra em `B`, nunca em `A`.
6. `RelatorioFechamentoCaixa` nunca recalcula esperado/contado/diferença — só lê o que já está persistido no fechamento de cada turno.
7. `RelatorioResultado` inclui lançamentos de todas as categorias (vendas, estorno, sangria, suprimento) — nunca só vendas/estorno.
8. Os 4 relatórios são funções de leitura pura — rodá-los em sequência não altera nenhuma linha em nenhuma tabela.
