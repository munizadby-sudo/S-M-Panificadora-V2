# SPEC-FE-008 — Fluxo de Caixa (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `frontend/src/modules/fluxo-caixa`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-FE-003 (`estado.js` do Caixa por Turno — reaproveitado), SPEC-BE-008 (contrato de API)
- **PRD de origem:** `PRD-009-fluxo-de-caixa.md`

---

## 1. Objetivo técnico

Especificar a tela de Fluxo de Caixa: lançamento manual sempre vinculado ao turno aberto, listagem sempre filtrada por turno (nunca por data corrida — é a correção central em relação ao V1), e exclusão de lançamento automático restrita a admin.

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/fluxo-caixa/index.js
export default {
  id: 'fluxo',
  label: 'Fluxo de Caixa',
  icone: 'ti-chart-line',
  permissao: 'fluxo',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Listagem por turno (somente leitura)
- Consumir `GET /api/fluxo-caixa` (SPEC-BE-008, Seção 5.2), **filtrado por padrão pelo turno atualmente aberto** (via `estado.js`, SPEC-FE-003 — nunca chamando `GET /api/caixa-turno/status` diretamente).
- Se não houver turno aberto, mostrar um seletor de turno/período para consulta administrativa (usando `data_inicio`/`data_fim`), já que sem turno aberto não faz sentido mostrar "o turno atual".
- Colunas: tipo (entrada/saída), descrição, categoria, forma, valor, origem (automático/manual), usuário.
- **Testável:** ver a listagem do turno aberto carregada de verdade, incluindo os lançamentos automáticos que Vendas já gerou.

### Passo 2 — KPIs consolidados
- Exibir o resumo (`GET /api/fluxo-caixa/resumo`, SPEC-BE-008, Seção 5.4) no topo: entradas e saídas por forma de pagamento — **inclui lançamentos manuais**, não só vendas/estorno (correção de 2026-08-18, ver SPEC-BE-008 Seção 4.4).
- **Testável:** lançar uma sangria manual e confirmar que o KPI de saída aumenta imediatamente — este é o teste real que importa, não comparar com o fechamento (os dois só coincidem quando não há lançamento manual no turno).

### Passo 3 — Lançamento manual
- Formulário: tipo (entrada/saída), descrição, categoria, forma, valor.
- **Sem campo de seleção de turno** — o backend já define isso sozinho como o turno aberto (SPEC-BE-008, Seção 4.1); a UI não deve nem sugerir que isso é escolhível.
- Se não houver turno aberto, o formulário fica desabilitado com a mesma mensagem de bloqueio usada no PDV (SPEC-FE-007, Passo 1) — reaproveitar o componente `AvisoCaixaFechado`.
- **Testável:** lançar uma sangria/suprimento manual e ver aparecer na listagem e refletido nos KPIs, sem precisar recarregar a página.

### Passo 4 — Exclusão de lançamento
- Lançamento **manual**: botão de excluir visível para qualquer usuário com permissão `fluxo`, com confirmação explícita e campo de motivo obrigatório.
- Lançamento **automático**: botão de excluir só aparece/funciona para `admin` — para operador comum, nem mostrar a ação (não só desabilitar, para não gerar confusão de "por que não consigo clicar").
- Submeter via `DELETE /api/fluxo-caixa/:id` (SPEC-BE-008, Seção 5.3).
- **Testável:** excluir um lançamento manual como operador comum (deve funcionar); tentar excluir um lançamento automático como operador comum (ação nem deve aparecer); excluir um automático como admin (deve funcionar, com motivo).

### Passo 5 — Exportação CSV
- Gerada **no frontend**, a partir dos dados já carregados na listagem (SPEC-BE-008, Seção 6 — decisão de não criar endpoint de backend para isso).
- **Testável:** exportar a listagem atual e conferir que o CSV reflete exatamente o que está na tela, incluindo os filtros aplicados.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `ListaFluxoCaixa` | Tabela de lançamentos do turno |
| `ResumoKPIs` | Totais por forma de pagamento |
| `FormularioLancamentoManual` | Criação, sem seleção de turno |
| `AvisoCaixaFechado` | Reaproveitado de `modules/pdv` (SPEC-FE-007) |

---

## 5. Fora de escopo desta SPEC

- Consulta consolidada de múltiplos turnos/período extenso com gráficos — isso pertence ao módulo de Relatórios.

---

## 6. Critérios de aceite técnicos

1. Nenhuma chamada a `GET /api/caixa-turno/status` acontece diretamente neste módulo.
2. O formulário de lançamento manual nunca oferece campo de seleção de turno.
3. Ação de excluir lançamento automático não aparece para usuário não-admin (não é só desabilitada, é ausente).
4. Os KPIs desta tela batem exatamente com o resumo de fechamento do mesmo turno, sempre.
5. Exportação CSV reflete exatamente os dados e filtros exibidos na tela no momento do clique.
