# SPEC-FE-012 — Relatórios (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-22
- **Módulo:** `frontend/src/modules/relatorios`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-BE-012 (contrato de API)
- **PRD de origem:** `PRD-012-relatorios.md`

---

## 1. Objetivo técnico

Especificar a tela de relatórios gerenciais: um filtro de período único (com atalho "Hoje") que alimenta os 4 relatórios da SPEC-BE-012, e exportação CSV gerada no navegador a partir dos dados já carregados — sem endpoint de exportação no backend (mesma decisão da SPEC-BE-008).

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/relatorios/index.js
export default {
  id: 'relatorios',
  label: 'Relatórios',
  icone: 'ti-chart-bar',
  permissao: 'rel',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Filtro de período com atalho "Hoje"
- Campos `data_inicio`/`data_fim`, padrão: hoje/hoje. Botão "Hoje" reseta os dois campos para a data atual e recarrega os 4 relatórios de uma vez.
- Os 4 relatórios sempre usam o **mesmo intervalo** — não existe filtro independente por relatório (reflete o requisito do PRD, Seção 3: "filtro por intervalo de datas... para todos os relatórios da tela").
- **Testável:** trocar o período e ver os 4 relatórios recarregarem com os novos dados.

### Passo 2 — Relatório de vendas
- Consumir `GET /api/relatorios/vendas` (SPEC-BE-012, Seção 5.1).
- Exibir total geral, tabela por forma de pagamento, tabela por produto (ordenada por receita, como o backend já devolve).
- **Testável:** ver os três blocos carregados com dados reais do período.

### Passo 3 — Fechamento de caixa por turno/período
- Consumir `GET /api/relatorios/fechamento-caixa` (SPEC-BE-012, Seção 5.2).
- Tabela com um turno por linha (data, período, esperado, contado, diferença, status), e um resumo do período no topo ou rodapé.
- Diferença negativa (`falta`) e positiva (`sobra`) com destaque visual diferente — mesma lógica de leitura rápida já usada em Estoque para "abaixo do mínimo".
- **Testável:** ver a lista de turnos fechados do período com os totais batendo com o resumo.

### Passo 4 — Curva ABC de produtos
- Consumir `GET /api/relatorios/curva-abc` (SPEC-BE-012, Seção 5.3).
- Duas visões: tabela "por receita" (com a coluna de classe A/B/C) e tabela "por quantidade" (sem classe — é só um ranking auxiliar, nunca inventar uma segunda classificação ABC por quantidade).
- Classe A/B/C vem pronta do backend — o frontend só exibe, nunca recalcula o percentual acumulado.
- **Testável:** ver os produtos ordenados corretamente nas duas tabelas, com a classe visível na primeira.

### Passo 5 — Resultado simplificado
- Consumir `GET /api/relatorios/resultado` (SPEC-BE-012, Seção 5.4).
- Exibir total de entradas, total de saídas, resultado (com destaque se negativo), e a tabela por categoria.
- **Testável:** ver o resultado do período refletindo entradas e saídas de todas as categorias, não só vendas.

### Passo 6 — Exportação CSV
- Botão "Exportar CSV" por relatório (um botão por bloco, não um único botão genérico) — exporta exatamente os dados já exibidos naquele bloco, no período atualmente filtrado.
- Gerado inteiramente no navegador (sem chamada de rede adicional) — mesma decisão de escopo da SPEC-BE-008, Seção 6.
- **Testável:** exportar cada um dos 4 relatórios e conferir que o CSV bate linha a linha com a tabela exibida.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `FiltroPeriodoRelatorios` | Campos de data + atalho "Hoje", compartilhado pelos 4 relatórios |
| `RelatorioVendas` | Total geral + tabela por forma + tabela por produto |
| `RelatorioFechamentoCaixa` | Tabela de turnos + resumo do período |
| `CurvaABC` | Duas tabelas (por receita com classe, por quantidade sem classe) |
| `RelatorioResultado` | Totais + tabela por categoria |
| `exportarCsv(nomeArquivo, linhas)` | Utilitário compartilhado pelos 4 botões de exportação — não duplicar lógica de CSV por relatório |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `400` — período inválido (`data_inicio > data_fim`) | Validação local espelha a regra antes de chamar a API, mas a mensagem do backend é a fonte de verdade se escapar |
| Qualquer relatório falhar | Mostrar o erro **só naquele bloco** — os outros 3 relatórios continuam exibindo o que já carregaram, um erro não derruba a tela inteira |

---

## 6. Fora de escopo desta SPEC

- DRE contábil formal, exportação para sistema contábil externo (já fora de escopo no PRD).
- Dashboards preditivos / previsão de demanda.
- Gráficos (a SPEC cobre tabelas; visualização gráfica pode ser uma iteração futura se priorizada).

---

## 7. Critérios de aceite técnicos

1. Trocar o período recarrega os 4 relatórios com o mesmo intervalo, nunca um período diferente por bloco.
2. Curva ABC exibe classe A/B/C só na tabela "por receita" — a tabela "por quantidade" nunca mostra uma classe inventada no frontend.
3. Exportação CSV de qualquer um dos 4 relatórios reflete exatamente os dados exibidos na tela, no período atual.
4. Falha em um relatório não impede a exibição dos outros 3.
5. Cada um dos 6 passos da Seção 3 é individualmente testável no navegador, na ordem descrita.
