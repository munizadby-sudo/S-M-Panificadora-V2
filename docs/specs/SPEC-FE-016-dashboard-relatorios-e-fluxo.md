# SPEC-FE-016 — Dashboard de Relatórios e Fluxo

- **Status:** Rascunho para revisão
- **Data:** 2026-08-23
- **Módulo:** `src/modules/relatorios` (extensão) + `src/modules/fluxo-caixa` (extensão)
- **Depende de:** SPEC-BE-014 (Dashboard de Relatórios — endpoint novo e campos novos), SPEC-BE-008 §5.4 (resumo de Fluxo, sem mudança), SPEC-FE-012 (Relatórios), SPEC-FE-008 (Fluxo de Caixa), SPEC-FE-015 (Design System — tokens de cor/espaçamento reaproveitados aqui)
- **PRD de origem:** `PRD-017-dashboard-de-vendas-e-fluxo.md`

---

## 0. Escopo

Só apresentação — nenhuma tela nova, nenhuma rota de menu nova. Adiciona uma seção de dashboard **no topo** das telas de Relatórios e Fluxo de Caixa que já existem, sem remover nada do que já está lá (tabelas de detalhe, filtros, exportação CSV continuam exatamente como são). Gráficos são **CSS puro** (divs com largura/altura proporcional via `style` inline calculado a partir do dado) — nenhuma biblioteca externa, nenhum `<canvas>`/`<svg>` gerado por lib de terceiro (mesma restrição do ADR-003).

---

## 1. Componente reutilizável de barra (novo arquivo `src/core/barras.js` ou `src/modules/relatorios/barras.js` reaproveitado por Fluxo)

Duas funções puras de template, sem estado, testáveis isoladamente:

```js
// barra horizontal (ex.: Por Forma de Pagamento, Top 5 Produtos)
htmlBarraHorizontal({ rotulo, valor, valorMaximo, corVar = '--destaque', formatador })
// retorna algo como:
// <div class="barra-h">
//   <span class="barra-h-rotulo">Pão Francês</span>
//   <div class="barra-h-trilho"><div class="barra-h-preenchimento" style="width: 72%; background: var(--destaque)"></div></div>
//   <span class="barra-h-valor">R$ 480,00</span>
// </div>

// barra vertical (Vendas por Hora)
htmlGraficoBarrasVerticais({ pontos, chaveRotulo, chaveValor, corVar = '--destaque', formatador })
// pontos = [{ hora: 8, quantidade: 34 }, ...]
// retorna um <div class="grafico-v"> com uma <div class="grafico-v-barra"> por ponto,
// altura em % relativa ao maior valor do próprio conjunto (nunca um valor fixo de escala)
```

Regras:
- `valorMaximo`/escala vertical sempre calculado a partir dos próprios dados recebidos (`Math.max(...)`) — nunca um valor fixo no código (mesmo cuidado do agrupamento por hora da SPEC-BE-014, para não repetir o erro de faixa fixa do V1, agora do lado do frontend).
- Conjunto vazio retorna uma string vazia ou o estado vazio padrão (PRD-016 §3.9) — nunca uma barra de altura/largura 0% renderizada sem contexto.
- Sem `Math.max` de array vazio (`-Infinity`) — checar tamanho antes.

---

## 2. Dashboard em Relatórios (`src/modules/relatorios`)

Novo bloco inserido em `renderizar()` (`index.js`), logo abaixo do filtro de período e acima dos blocos já existentes (Vendas/Fechamento/Curva ABC/Resultado, que não mudam).

### 2.1 Cards de KPI

Consome os 3 campos novos do endpoint já existente (SPEC-BE-014 §5.1): `quantidade_itens`, `numero_vendas`, `ticket_medio` — **mesma chamada** `buscarRelatorioVendas` que já existe em `api.js`, sem requisição adicional.

```js
htmlCardsKpiVendas({ totalGeral, quantidadeItens, ticketMedio })
```
3 cards lado a lado (`display: grid`/`flex`, `gap` do design system): "Receita total", "Itens vendidos", "Ticket médio" — mesmo padrão visual de card usado em outros lugares do sistema (fundo `--superficie-elevada`, borda `--linha`, `--raio`).

### 2.2 Gráfico "Vendas por Hora"

- Novo método em `api.js`: `buscarVendasPorHora({ data_inicio, data_fim })` → `GET /relatorios/vendas-por-hora` (SPEC-BE-014 §5.2).
- Novo bloco carregado em paralelo com os outros 4 (`Promise.all` em `carregarTodos()`, junto de vendas/fechamento/curvaAbc/resultado — mesmo padrão de estado `{ dados, erro, carregando }` por bloco).
- Renderiza com `htmlGraficoBarrasVerticais({ pontos: dados.por_hora, chaveRotulo: 'hora', chaveValor: 'quantidade' })`, rótulo de cada barra é a hora (`8h`, `9h`...).
- Sem dado no período → estado vazio (PRD-016 §3.9), não um gráfico com barras zeradas.

### 2.3 Gráfico "Por Forma de Pagamento"

**Não busca dado novo** — reaproveita `estado.vendas.dados.por_forma_pagamento`, que já é carregado pelo bloco "Vendas" existente. Renderiza com `htmlBarraHorizontal` para cada forma, uma barra por linha, ordenado por valor desc (mesma ordenação que a tabela já usa).

### 2.4 "Top 5 Produtos"

**Não busca dado novo** — reaproveita `estado.vendas.dados.por_produto` (já vem ordenado por receita desc, SPEC-BE-012 §4.1). Pega os 5 primeiros, renderiza com `htmlBarraHorizontal`. A tabela completa de produtos continua existindo, sem mudança, mais abaixo (no bloco "Vendas" já existente).

---

## 3. Dashboard em Fluxo de Caixa (`src/modules/fluxo-caixa`)

Só aparece quando há turno aberto (mesma condição que já existe hoje para `htmlResumoKPIs` em `index.js` linha ~166: `estado.turnoAberto ? htmlResumoKPIs(estado.resumo) : ''`) — não muda essa condição.

Adicionar, acima da tabela de resumo por forma de pagamento que já existe (`resumo.js`, `htmlResumoKPIs`), 3 cards consolidados calculados a partir do **mesmo** `estado.resumo` já carregado por `carregarResumo()` — nenhuma chamada de API nova:

```js
// resumo.js — nova função, ao lado de htmlResumoKPIs já existente
htmlCardsKpiFluxo(resumo)
// soma as 3 formas (dinheiro/pix/cartao) de resumo.entradas e resumo.saidas
// (soma de números já agregados pelo backend — não é o erro do V1, que somava lista bruta)
// Entradas = Σ entradas, Saídas = Σ saidas, Líquido = Entradas − Saídas
```
A tabela por forma de pagamento (`htmlResumoKPIs`) continua existindo abaixo, sem mudança — os cards são um resumo consolidado, a tabela é o detalhe.

---

## 4. Refinamento visual — ícone + acento âmbar único (comparação com referência visual, 2026-08-23)

Comparação com uma referência visual externa (sistema derivado do V1, fora deste repositório — usado só como inspiração de valores, nunca como código a importar, mesma regra já usada no resto do redesign) mostrou dois pontos de estilo que valem a pena replicar, com uma ressalva:

**Cards de KPI — ícone + acento único, não cor própria por card.** A referência usa uma cor diferente por card (verde/azul/roxo/roxo-escuro). Isso colide com SPEC-FE-015 §3.1 ("cor com significado único") — verde e vermelho já são reservados para aberto/fechado e sucesso/erro, azul (`--selecao`) já é reservado para estado de seleção. Em vez disso, todo card de KPI (Relatórios e Fluxo) usa o mesmo acento `--destaque` (âmbar da marca) e se diferencia por um emoji/ícone à esquerda do rótulo — mesmo padrão de "emoji como identidade visual" já usado em outros lugares (SPEC-FE-015 §2.6). Sugestão de ícone por card (livre para ajustar): 💰 Receita total, 🛒 Itens vendidos, 🎫 Ticket médio, ⬆ Entradas, ⬇ Saídas, ⚖️ Líquido.

**Atenção — não replicar:** a referência tem um card "Resumo" que nunca é preenchido (mesmo bug de elemento morto do V1, já documentado em PRD-017 Seção 2 e explicitamente fora de escopo). Nenhum card desta spec deve existir sem estar de fato ligado a um dado real — se não há um 4º KPI com dado de verdade para Relatórios, o dashboard tem 3 cards, não 4 com um decorativo.

**Navegação — destacar o módulo ativo com o acento da marca.** Hoje `#menu-principal button.ativo`/`:hover` (`frontend/index.html`, regra CSS por volta da linha 134) só troca para `background: var(--superficie)` — quase imperceptível. Trocar para um destaque claro usando `--destaque` (ex.: fundo `--destaque` com texto escuro de contraste, ou borda inferior de 2-3px em `--destaque`), mantendo a mesma regra de acessibilidade de foco por teclado já definida (SPEC-FE-015 §3.5).

**Fora desta rodada (possível próximo passo, não implementar agora):** o campo "Tipo" do lançamento manual de Fluxo (`fluxo-caixa/formulario.js`, hoje um `<select>` Entrada/Saída) aparece na referência como dois botões de alternância (toggle). É uma mudança de interação, não só de estilo — maior escopo, fica para uma spec/prompt separado se você quiser seguir com ela depois de validar o dashboard.

---

## 5. Testes

Seguindo o padrão já usado em todo o projeto (teste de função pura sem DOM + teste de integração do módulo):

- `barras.js`: teste unitário de `htmlBarraHorizontal`/`htmlGraficoBarrasVerticais` — escala relativa ao próprio conjunto, conjunto vazio não gera `NaN%`/`-Infinity%` no `style`.
- `relatorios/api.js`: teste de `buscarVendasPorHora` chama `GET /relatorios/vendas-por-hora` com os params corretos (mesmo padrão dos outros `buscarX` já testados).
- `relatorios/index.js`: teste de que os 3 KPIs exibidos batem com os campos `quantidade_itens`/`numero_vendas`/`ticket_medio` da resposta mockada; teste de que o gráfico de vendas por hora é carregado em paralelo com os outros blocos (mesmo `Promise.all`).
- `fluxo-caixa/resumo.js`: teste de `htmlCardsKpiFluxo` — soma das 3 formas bate com o resumo mockado.
- Nenhum teste novo deve reduzir a cobertura dos testes já existentes de `relatorios`/`fluxo-caixa` (264 testes na última contagem, ver SPEC-FE-015 §6 critério 9) — suíte completa continua passando 100%.

---

## 6. Critérios de aceite técnicos

1. Nenhuma nova chamada de rede é feita para os gráficos "Por Forma de Pagamento", "Top 5 Produtos" e cards de Fluxo — reaproveitam dado já carregado pela própria tela.
2. `GET /relatorios/vendas-por-hora` é chamado em paralelo com os outros 4 relatórios (mesmo `Promise.all`), não em sequência depois deles.
3. Escala de qualquer gráfico (largura/altura das barras) é sempre relativa ao maior valor do próprio conjunto de dados exibido — grep por qualquer constante numérica de escala fixa em `barras.js`/`blocos.js`/`resumo.js` deve dar zero resultado.
4. Nenhum gráfico ou card renderiza com dado vazio/zerado sem contexto — período sem venda mostra o estado vazio padrão (PRD-016 §3.9), nunca uma barra de 0% sem explicação.
5. Cards de KPI de Relatórios e de Fluxo usam os tokens de cor/espaçamento/raio do design system (SPEC-FE-015 §2.1/§2.5) — nenhuma cor hex literal nova.
6. Nenhuma dependência externa adicionada (`package.json` do frontend, se existir, ou `<script src="https://...">` em `index.html`) — grep confirma zero.
7. Suíte completa de `frontend/` passa 100% depois da mudança.
8. Todo card de KPI usa o mesmo acento `--destaque` — grep por `--sucesso`/`--perigo`/`--selecao` nos arquivos de card de KPI (`blocos.js`, `resumo.js`) deve dar zero resultado (essas cores continuam reservadas aos seus significados já fixados).
9. Nenhum card é criado sem estar ligado a um dado real vindo do backend — nenhum elemento "decorativo" tipo o card "Resumo" morto da referência.
