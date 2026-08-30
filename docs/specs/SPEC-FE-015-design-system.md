# SPEC-FE-015 — Design System (Tokens, Componentes e Navegação)

- **Status:** Em execução (onda clean full-system 2026-08-23; refinos PDV e modais de cadastro 2026-08-26; layout estreito 2026-08-28)
- **Data:** 2026-08-23 (atualizado 2026-08-28 — breakpoints de layout, PRD-016 §3.12)
- **Módulo:** `frontend/index.html` (CSS central) + `frontend/login.html` — transversal a todos os módulos
- **Depende de:** SPEC-FE-001 (Fundação), PRD-016 (Redesign de Interface)
- **PRD de origem:** `PRD-016-redesign-de-interface.md`
- **Referência visual local (não importar código):** `C:\Users\Panificadora S&M\Desktop\Sistema-Padaria-Docker\padaria-pdv`
- **Tom desta onda:** clean mínimo (pouco ruído, tipografia clara, espaço consistente)
- **Referência de auditoria:** artifact ["Redesign do PDV — S&M Panificadora"](https://claude.ai/code/artifact/58087395-4497-462c-b7af-1d9950010e9d)

---

## 0. Escopo — o que este SPEC muda e o que não muda

**Muda:** tokens de cor/tipografia/espaçamento em `:root` (`index.html` e `login.html`), estilos de componente que dependem deles, navegação do header, aparência de modais/botões/inputs, e comportamentos de UI pontuais (estado vazio, legenda de atalhos, foco em grade). Escopo desta onda: **login → último modal**.

**Não muda:** nenhuma lógica de negócio, nenhum caso de uso, nenhuma chamada de API. Módulos (`modules/*/index.js`, `api.js`, `validacao.js` etc.) continuam iguais. Mudança estrutural de HTML, quando necessária, é só no template `html*`, nunca na lógica de estado.

**Não confundir com `padaria-pdv`:** projeto separado (referência visual). Este SPEC **não importa código de lá**. Também **não** reintroduz bugs do V1 (faixa fixa 6h–19h; KPI Descontos/Resumo vazio).

### 0.1 Plano de fases (onda clean 2026-08-23)

| Fase | Escopo | Critério de pronto | Status |
|------|--------|-------------------|--------|
| **0** | Tokens + CSS base global | Controles sem classe não ficam cinza-claro; tokens únicos | Feito |
| **1** | Login + shell | Login escuro alinhado; menu clean | Feito |
| **2** | PDV + modal de pagamento + atalhos | Grade/carrinho/modal clean; atalhos visíveis; modal tipo V1 | Feito (refino 2026-08-26, SPEC-FE-007 §11) |
| **3** | Caixa + Fluxo | Modais e KPIs clean | Feito |
| **4** | Relatórios / Dashboard | Clean; faixa de horas dinâmica | Feito |
| **5** | Estoque, Produção, Perdas, Encomendas | Tabelas/filtros/modais | Feito |
| **6** | Produtos, Clientes, Funcionários, Usuários, Config | Cadastros | Feito |
| **7** | Passada final em todos os modais | Aceite PRD-016 §7 + `npm test` verde | Feito |

Cada fase: mudança de apresentação → `npm test` em `frontend/` → validação visual → próxima fase.

---

## 1. Objetivo técnico

Substituir a paleta clara atual (`--fundo: #f6f1ea` e derivados) por uma paleta escura com papéis de cor resolvidos, consolidar ~15 ocorrências de cor hardcoded (`#9b2c2c`, `#2f6b3a`, `#1f6b3a` espalhadas pelo arquivo) em tokens nomeados, reestruturar a navegação do header em dois grupos, e aplicar os ajustes de componente descritos no PRD-016.

---

## 2. Tokens (substituem o bloco `:root` atual)

### 2.1 Cor

| Token | Valor | Papel — nunca reaproveitado para outro |
|---|---|---|
| `--fundo` | `#14171c` | Fundo da página |
| `--superficie` | `#1b1f27` | Cards, linhas de tabela |
| `--superficie-elevada` | `#232833` | Modais, inputs |
| `--linha` | `#2e3440` | Bordas, divisores |
| `--texto` | `#eef1f5` | Texto principal |
| `--muted` | `#8b93a3` | Texto secundário — **mínimo 12px** em telas operacionais (PRD-016, Seção 3.4) |
| `--destaque` | `#e0913a` | Marca e ação primária — **só isso** |
| `--destaque-escuro` | `#f2a94f` | Hover/estado forte do destaque |
| `--sucesso` | `#3ecf8e` | Confirmação/sucesso — **só isso**, nunca seleção |
| `--perigo` | `#e5484d` | Ação destrutiva/fechamento — **só isso** |
| `--selecao` | `#5b9dd9` | **Novo.** Opção ativa/selecionada num grupo de escolha (ex.: forma de pagamento) — nunca reaproveita `--sucesso` (resolve PRD-016, Seção 3.1) |
| `--aviso` | `#e0b34d` | Estados de atenção não-crítica |

**Migração:** os 15 usos hardcoded de `#9b2c2c` (erro) e `#2f6b3a`/`#1f6b3a` (sucesso/sobra) espalhados pelo arquivo devem ser substituídos por `var(--perigo)` e `var(--sucesso)` respectivamente — nenhuma cor de estado deve continuar como literal hex fora de `:root` depois deste SPEC.

### 2.2 Tipografia

| Papel | Fonte | Observação |
|---|---|---|
| Corpo/UI (padrão) | manter `"Segoe UI", Tahoma, sans-serif` já em uso — **não introduzir Google Fonts/web font nova**, evita dependência de rede num sistema que roda offline em PC de loja | — |
| Preços, horários, atalhos de teclado | `"Consolas", "Courier New", monospace` (já disponível sem carregar fonte externa) | reforça leitura tabular de valores monetários e o caráter de atalho (`F10`, `Esc`) |

**Nota:** a auditoria original sugeria Fraunces/IBM Plex via Google Fonts — **revertido aqui** porque contradiz a exigência operacional de rodar sem depender de internet (ADR-003). O ganho tipográfico do redesign vem da escala consistente (Seção 2.3), não de trocar a família de fonte.

### 2.3 Escala tipográfica

| Papel | Tamanho | Peso |
|---|---|---|
| Título de módulo (`h1`) | `1.375rem` (22px) | 600 |
| Título de seção/modal (`h2`) | `1.0625rem` (17px) | 600 |
| Corpo padrão | `0.875rem` (14px) | 400 |
| Rótulo de campo/cabeçalho de tabela | `0.75rem` (12px), uppercase, `letter-spacing: 0.04em` | 600 |
| Texto de apoio em tela operacional (Caixa, Encomendas, Estoque, Fluxo) | `0.75rem` (12px) mínimo | 400 |
| Texto de apoio em tela administrativa (Config, Relatórios, Usuários, Funcionários) | `0.6875rem` (11px) permitido | 400 |

### 2.4 Base global de controles (novo — corrige lacuna encontrada em teste manual, 2026-08-23)

Ao aplicar os tokens da Seção 2.1, ficou visível em teste manual que **botões, inputs e selects sem classe específica continuam com a aparência padrão do navegador** (cinza claro), destoando do fundo escuro — em telas como Funcionários (botões "Cadastro/Adiantamentos/Ocorrências/Folha", "Editar/Desativar") e PDV (botões de forma de pagamento, campo de busca). Retrofitar uma classe própria em cada botão já existente do sistema (15+ módulos) é um esforço grande e arriscado pra este momento.

**Decisão:** adicionar uma regra de base global, que funciona como rede de segurança — qualquer `button`/`input`/`select`/`textarea` sem classe mais específica cai nela; componentes já classificados (`.pdv-btn`, `.pdv-card`, etc.) continuam vencendo por especificidade, sem mudança neles.

```css
button, input, select, textarea {
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--texto);
}

button {
  cursor: pointer;
  background: var(--superficie-elevada);
  border: 1px solid var(--linha);
  border-radius: 8px;
  padding: 0.5rem 1rem;
}
button:hover { border-color: var(--destaque); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

input, select, textarea {
  background: var(--superficie-elevada);
  border: 1px solid var(--linha);
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--selecao);
  box-shadow: 0 0 0 3px rgba(91, 157, 217, 0.2);
}
```

Referência de valores (padding, border-radius, comportamento de foco) verificada contra a implementação já validada visualmente em `padaria-pdv` (`frontend/css/style.css`, classes `.btn-sec`/`.rel-date-filter input`) — só como conferência de que os números "parecem certos" na prática, nenhum código de lá é copiado ou importado.

### 2.5 Espaçamento

Escala única: `4, 8, 12, 16, 24, 32, 48px`. Telas operacionais usam o topo da escala baixo (`8px`/`12px` internos); telas administrativas usam `16px`/`24px`. Nenhum valor de `padding`/`margin`/`gap` fora dessa lista em CSS novo ou revisado por este SPEC.

### 2.6 Refinamentos visuais adicionais (incorporados após comparação com referência visual, 2026-08-23)

Tokens novos, complementando a Seção 2.1:

| Token | Valor | Uso |
|---|---|---|
| `--raio` | `14px` | Cards, painéis, modais (botões continuam com `8px`, já definido na Seção 2.4) |
| `--sombra` | `0 10px 32px rgba(0,0,0,0.45)` | Modais, login |
| `--brilho-destaque` | `0 0 0 1px rgba(224,145,58,0.15), 0 8px 24px rgba(224,145,58,0.18)` | Hover de card de produto |
| `--brilho-sucesso` | `0 0 0 1px rgba(62,207,142,0.15), 0 8px 24px rgba(62,207,142,0.22)` | Hover/estado de botão de sucesso |

Ajustes de componente:

- **Fundo da página:** `background: radial-gradient(ellipse at top, #1a1f26 0%, var(--fundo) 55%)` em vez de cor chapada — profundidade sutil, sem custo de performance perceptível.
- **Cards de produto (hover):** `transform: translateY(-2px); box-shadow: var(--brilho-destaque);` — nunca em telas administrativas de tabela densa, só na grade do PDV.
- **Feedback de clique (`:active`):** `transform: scale(0.97)` em cards e botões de ação — reforça o clique sem depender só de mudança de cor.
- **Filtros de categoria/status (pílula):** `border-radius: 999px`, contorno (`--linha`) quando inativo, preenchido com `--destaque` quando ativo — aplicar em filtros de status de Encomendas, categoria de Produtos/PDV, período de Estoque. Substitui o botão quadrado atual nesses casos específicos.
- **Badges (revisão da Seção 3.2):** fundo translúcido na cor do papel + texto na cor cheia — `background: rgba(<rgb do token>, 0.2); color: var(--token);` — em vez de preenchimento sólido. Mais legível em conjunto (várias badges lado a lado) e menos cansativo visualmente que blocos de cor cheia.
- **Scrollbar customizada** (`::-webkit-scrollbar`, 4-6px, thumb na cor `--linha`) — aplicar globalmente; sem efeito em navegadores que não suportam (degrada para a scrollbar padrão do SO, sem quebra).
- **Marca no header e no login:** logo horizontal em SVG clara (`frontend/assets/logo-horizontal-tela.svg`) no lugar do texto “S&M Panificadora” (ISSUE-011). Sem pipeline de build — arquivo estático servido com o frontend. No papel (cupom / fechamento) continua a PNG 1-bit em data URI (SPEC-FE-017).
- **`backdrop-filter: blur()` — só no overlay de modal, nunca na barra de navegação fixa.** Modal abre/fecha (efeito pontual, sem custo contínuo); a barra de navegação é `sticky` e recalcularia o blur a cada rolagem da tela — risco real de travamento em placa de vídeo integrada, o hardware mais comum num PC de loja (ADR-003). Header mantém fundo sólido (`--superficie`), sem blur.

**Fora deste SPEC, deliberadamente:** gráficos de barra em CSS puro para Relatórios (viável tecnicamente, sem violar nenhuma restrição de build/dependência) — fica como incremento futuro, um adendo pontual à SPEC-FE-012 depois que este SPEC estiver estável, para não empilhar duas mudanças na mesma tela ao mesmo tempo.

### 2.8 Breakpoints de layout (PRD-016 §3.12, 2026-08-28)

CSS central em `frontend/index.html` (marcador `layout-responsivo`) e `frontend/login.html`. Não muda regra de negócio nem o fluxo de teclado do PDV.

| Largura | O que muda |
|---|---|
| ≤ 1100px | Header (`.topo`) quebra linha; `.topo-direita` envolve |
| ≤ 900px | `#menu-principal` rola na horizontal (sem wrap); `#conteudo` com padding menor; tabelas de listagem com `overflow-x: auto`; formulários e modais `width`/`max-height` na viewport (`100dvh`) |
| ≤ 800px | `.pdv-painel` empilha (grade de produtos acima, carrinho abaixo) |
| ≤ 560px | Formulários de Fluxo, formas de encomenda e KPIs em uma coluna; `font-size: 1rem` em controles (evita zoom iOS); login com padding de página |

**Não faz:** POS de toque, atalhos removidos, grade do PDV redesenhada para dedo. `minmax(0, …)` no painel do PDV evita overflow mesmo acima de 800px.

---

## 3. Componentes

### 3.1 Estado de seleção (resolve PRD-016 Seção 3.2)
Elemento selecionável (card de produto, opção de pagamento, linha de tabela ativa) usa **borda de cor cheia + `box-shadow: 0 0 0 1px var(--token) inset`** no estado selecionado — nunca só mudança sutil de espessura/tom de borda. O token de cor depende do papel: `--destaque` para "produto em foco no PDV" (é navegação, não confirmação), `--selecao` para "opção escolhida num formulário" (ex.: forma de pagamento).

**Exceção (operador, 2026-08-26):** no modal de pagamento do PDV a forma **escolhida** usa fundo `--sucesso` (igual à V1). `--selecao` continua no anel de foco dos **cards de produto** (`.pdv-produto-foco`). Confirmar/Finalizar também usam `--sucesso` (Seção 3.3) — são confirmação, não o mesmo papel da grade.

### 3.2 Badges de status
Sempre ícone/forma + texto, nunca só cor (acessibilidade a daltonismo, já parcialmente seguido no código atual — reforçar em todo lugar novo): `● Aberto` (`--sucesso`), `● Fechado` (`--perigo`), `● Selecionado` (`--selecao`). Visual: fundo translúcido + texto na cor cheia (Seção 2.6), não preenchimento sólido.

### 3.3 Botões — papel fixo por cor
- Primário (`--destaque`): Salvar, Nova Encomenda, Cadastrar.
- Sucesso (`--sucesso`): Finalizar Venda, Abrir Caixa, Confirmar. **Finalizar Venda** (`#btn-finalizar-venda`) e **Confirmar venda** no modal: gradiente `--sucesso`, `--brilho-sucesso` e pulso só quando habilitados; desabilitados cinza, sem animação. `prefers-reduced-motion: reduce` desliga o pulso.
- Perigo (`--perigo`): Fechar Caixa, Cancelar Encomenda, Desativar.
- Ghost (transparente, borda `--linha`): Cancelar, Voltar.

**Caixas flutuantes de cadastro (2026-08-26):** Nova/Editar encomenda, Registrar perda, Lançar produção e Novo/Editar funcionário usam o mesmo cromo do modal **Editar usuário**: overlay `z-index: 100`, card `--superficie-elevada`, cabeçalho + corpo com scroll + rodapé com borda, **Cancelar** ghost à esquerda do par e ação primária em gradiente `--sucesso` à direita. O formulário é a própria caixa (`role="dialog"`). Adiantamentos, ocorrências e folha continuam inline.

Nenhum botão reaproveita `--sucesso` para "opção selecionada" — usar `--selecao` (corrige o achado mais crítico da auditoria). **Exceção:** forma de pagamento selecionada no modal do PDV (Seção 3.1).

### 3.4 Legenda de atalhos de teclado (resolve PRD-016 Seção 3.7)
Barra sempre visível (`ul.pdv-atalhos`) acima do título **Vendas**: teclas em `--aviso`, descrições em `--muted`, itens lado a lado. Sem `<details>`/`<summary>`. Conteúdo: `F1`, `F2-F8`, setas, `Enter`, `Del`, `Esc`, `F10`. **Não** incluir `1`/`2`/`3`/`4` na barra — só no modal. Não copiar F9 / `+` da V1. Detalhe: SPEC-FE-007 §11.1.

### 3.5 Navegação por teclado na grade de produtos (resolve PRD-016 Seção 3.8)
Implementar como *roving tabindex*: o card com foco tem `tabindex="0"`, os demais `tabindex="-1"`. Handler de `keydown` no container da grade: `ArrowRight`/`ArrowLeft` movem uma posição; `ArrowUp`/`ArrowDown` movem uma linha inteira (número de colunas visíveis); se **não há** linha abaixo/acima, o índice não muda (não pular para o último/primeiro da mesma linha). `Enter` adiciona o item focado e o foco **permanece** nesse card depois do re-render. `Tab` sai da grade (nunca intercepta `Tab` para navegar dentro da grade).

O atalho global de setas **não** trata o evento se `defaultPrevented` (evita andar duas casas no mesmo toque). Re-render da tela (busca, carrinho) restaura foco e cursor da busca (`capturarFocoUi` / `restaurarFocoUi`). Anel de foco: `outline: 2px solid var(--selecao); outline-offset: 2px` em `:focus`, `:focus-visible` e `.pdv-produto-foco`. Detalhe: SPEC-FE-007 §11.2.

### 3.6 Estado vazio (resolve PRD-016 Seção 3.9)
Toda função `html*Vazio()`/equivalente (Encomendas, Perdas, Produção, Clientes, Funcionários) ganha uma segunda linha explicando o que aparece ali, além do texto "Nenhum/Nenhuma [item]." já existente — sem novo componente, só template.

### 3.7 Feedback mínimo em campo de senha (resolve PRD-016 Seção 3.10)
No modal de usuário, indicador simples de "campo preenchido" (ex.: contorno muda de `--linha` para `--destaque` quando o campo tem conteúdo) — sem medidor de força, sem regra nova de validação.

### 3.8 Indicador de turno compacto + remoção da duplicidade de banner (achado em teste manual, 2026-08-23)

**Bug encontrado:** o módulo `caixa-turno` renderiza seu próprio banner de status (`caixa-turno/index.js`, dentro de `renderizarTela()`) **além** do banner global já montado fora do roteador em `index.html` (`#caixa-turno-banner`, via `montarBanner`) — resultado: banner duplicado na própria página Caixa, e um banner de largura total aparecendo em todas as páginas (Encomendas, Clientes etc.), competindo com o conteúdo de cada tela (mesmo problema já registrado no PRD-016, Seção 3.5, para o banner na tela de PDV).

**Correção — trocar o banner global de largura total por um indicador compacto:**
- Remover a montagem do banner de largura total em `index.html` (`montarBanner(banner)` sobre `#caixa-turno-banner`) — não fica mais visível em toda tela.
- No lugar, adicionar um indicador compacto ao lado do nome do usuário/botão Sair: um ponto colorido (`● ` verde `var(--sucesso)` se aberto, vermelho `var(--perigo)` se fechado) + texto curto (“Turno da manhã” / “Caixa fechado”), reaproveitando `getTurnoAtual`/`onMudancaDeTurno` de `caixa-turno/estado.js` (mesma fonte de dado que o banner já usa hoje — só muda a apresentação, não a lógica de estado).
- Remover a `<div id="caixa-turno-status-modulo">` duplicada de dentro de `caixa-turno/index.js` (`renderizarTela()`, linha com `class="caixa-turno-banner"`) — a página Caixa não precisa mais do próprio banner de largura total, já que o indicador compacto no header cobre a mesma informação em qualquer tela, inclusive nela.
- **Correção adicional (achada em teste manual do rollout, 2026-08-23):** o módulo `pdv` (Vendas) tem a mesma duplicidade — `modules/pdv/index.js` renderiza `<div id="pdv-banner" class="caixa-turno-banner">` e chama `montarBanner(...)` tanto no ramo de caixa aberto quanto no de caixa fechado da função `renderizar()` (junto com `cancelarBanner` em `montar`/`desmontar`). Remover o `#pdv-banner` e as três chamadas de `montarBanner`/`cancelarBanner` associadas a ele em `pdv/index.js`, pelo mesmo motivo: o indicador compacto do header já cobre essa informação em qualquer tela.
- A tela de PDV/Vendas mantém apenas seu aviso de negócio específico de "caixa fechado" (`modules/pdv/aviso.js`, `htmlAvisoCaixaFechado()`) sem alteração — ele bloqueia a venda com uma mensagem própria e não depende do banner removido.

**Critério de aceite adicional:**
- Nenhum banner de largura total aparece fora do header, em nenhuma tela (incluindo Vendas/PDV).
- A tela Caixa não mostra dois indicadores de status — só o compacto no header.
- Indicador compacto muda de cor/texto em tempo real quando o turno abre/fecha (mesmo comportamento reativo que `onMudancaDeTurno` já fornecia ao banner antigo).

---

## 4. Navegação (resolve PRD-016 Seção 3.6)

Header atual (`#menu-principal`, uma fileira de botões) passa a agrupar módulos operacionais (sempre visíveis, à esquerda) e administrativos (em um `<select>` ou menu suspenso único "Mais ▾", à direita):

- **Operacional (sempre visível):** Encomendas, Estoque, Fluxo. ("Caixa" sai da lista — vira ação contextual, ver Seção 7.)
- **Administrativo (agrupado):** Relatórios, Produtos, Usuários, Configurações, Funcionários.

O roteador (`core/router.js`) não muda sua API (`registrarModulo`, `navegarPara`) — só a apresentação do menu (`renderizarMenu()`) passa a renderizar dois grupos em vez de uma lista única. Módulos continuam sendo filtrados por permissão exatamente como hoje (`temPermissao`/checagem de `role admin` para os casos especiais de Usuários e Funcionários, já definidos nas SPEC-FE-013/014).

---

## 5. Plano de rollout (ordem sugerida, uma tela por vez)

1. Tokens em `:root` + consolidação das cores hardcoded (Seção 2.1) + base global de controles (Seção 2.4) — mudança de base, afeta tudo de uma vez, deve ser feita e testada visualmente **em pelo menos 3 telas diferentes** (uma operacional, uma administrativa, um modal) antes de seguir — é exatamente aqui que a lacuna de botão/input sem estilo apareceu na primeira tentativa.
2. Header/navegação agrupada (Seção 4).
3. PDV/Caixa: estado de seleção de card, atalhos visíveis acima do título, navegação por teclado (Seções 3.1, 3.4, 3.5) — é a tela de maior uso, prioridade depois da base.
4. Modal de pagamento: lista vertical, forma escolhida em `--sucesso` (exceção §3.1), **Valor recebido** só em Dinheiro (SPEC-FE-007 §11.3).
5. Estados vazios de todos os módulos (Seção 3.6).
6. Modal de usuário: feedback de senha (Seção 3.7).
7. Refinamentos visuais (Seção 2.6): gradiente de fundo, sombras/glow, filtros em pílula, hover/press, badges translúcidas, scrollbar customizada — por último, depois que a estrutura (passos 1-6) já estiver validada, já que são ajustes puramente estéticos sobre uma base que precisa estar correta primeiro.

---

## 6. Critérios de aceite técnicos

1. Nenhuma cor de estado (`sucesso`/`perigo`/`selecao`) aparece como valor hex literal fora do bloco `:root` depois da migração.
2. `--selecao` e `--sucesso` nunca aparecem no mesmo componente representando o mesmo conceito — grep por `var(--sucesso)` em qualquer arquivo de UI de escolha/seleção (não confirmação) deve dar zero resultado, **exceto** `.pdv-forma.ativo` no modal de pagamento (Seção 3.1, 2026-08-26).
3. Menu do header mostra 3 itens operacionais sempre visíveis (Encomendas, Estoque, Fluxo — "Caixa" não é mais item de menu, ver Seção 7) + 1 agrupador administrativo, testável visualmente e via `frontend/tests`.
4. Grade de produtos do PDV: `ArrowRight`/`ArrowLeft`/`ArrowUp`/`ArrowDown` movem o foco entre cards; `Enter` adiciona ao carrinho; `Tab` sai da grade inteira — testável simulando eventos de teclado sem mouse.
5. Nenhuma fonte externa (Google Fonts ou similar) é carregada — `frontend/index.html` continua funcionando com a rede desligada (mesmo critério já usado pra validar ADR-003).
6. Todo estado vazio revisado por este SPEC tem pelo menos duas linhas de texto (o que está vazio + o que aparece ali).
7. Nenhum `button`/`input`/`select`/`textarea` do sistema renderiza com a aparência padrão do navegador (cinza claro) sobre o fundo escuro — verificar manualmente pelo menos as telas de Funcionários, PDV e um modal de cadastro (Usuários) depois da Seção 2.4 aplicada.
8. `backdrop-filter` aparece só na regra do overlay de modal — nenhuma ocorrência em `#menu-principal`/header ou qualquer elemento `sticky`/`fixed` de rolagem contínua.
9. Suíte de testes de `frontend/` (220+ testes na última contagem) passa integralmente depois de cada etapa do rollout — nenhuma regressão introduzida por mudança de CSS/template.
10. `index.html` contém o bloco `layout-responsivo` com `@media (max-width: 1100px)`, `900px`, `800px` e `560px`; `login.html` contém `@media (max-width: 560px)`. Em viewport 390px (suíte `demo/specs`), o documento não gera scroll horizontal da página e `.pdv-painel` tem uma coluna.

---

## 7. Caixa como modal contextual em Vendas (decisão do usuário, 2026-08-23 — substitui item de menu "Caixa")

**Motivação:** abrir/fechar caixa é uma ação vinculada à operação de vender, não uma tela própria que a pessoa precisa navegar até. Tirar do menu principal e colocar como ação contextual disparada de dentro de Vendas (ou do indicador de turno no header) reduz um item de navegação e deixa o fluxo mais direto — sugestão do usuário, aceita por não alterar nenhuma regra de negócio, só a apresentação.

**Mudança de arquitetura:**
- `caixa-turno` deixa de ser um módulo registrado no roteador: remover `router.registrarModulo(moduloCaixa)` e o `import` correspondente de `frontend/index.html` (linhas ~1918 e ~1934 na versão atual), e remover `'caixa-turno'` de `IDS_OPERACIONAIS` em `frontend/src/core/router.js`.
- A lógica de `frontend/src/modules/caixa-turno/index.js` (abertura, contagem, revisão com impressão obrigatória, fechamento, resumo) é reaproveitada quase integralmente — as funções internas de renderização (`renderizarAbertura`, `renderizarFechamento`, `renderizarContagem`, `renderizarBoxRevisao`, `renderizarResumo`) continuam as mesmas. O que muda é o container alvo: em vez de montar no `#conteudo` do roteador via `montar(container)`/`desmontar()` chamados pelo router, o módulo passa a expor algo como `abrirModal()`/`fecharModal()` que monta/desmonta dentro de um `<dialog>` (ou `div` com `role="dialog"` + overlay) inserido uma vez no `index.html` (fora do `#conteudo`, ao lado de onde hoje fica `#caixa-turno-banner`).
- **Gatilho:** o indicador compacto de turno no header (Seção 3.8, hoje `#caixa-turno-banner` em `.topo-direita`) vira clicável — de `<div>` para `<button>` (ou envolto por um) — e abre o modal a partir de qualquer tela, não só de Vendas. Isso cobre também fechar o caixa estando em Encomendas/Estoque/etc. sem precisar voltar pra Vendas.
- `frontend/src/modules/pdv/aviso.js`: `irParaTelaDeCaixa()` hoje faz `raiz.querySelector('[data-modulo-id="caixa-turno"]').click()` — esse seletor deixa de existir quando o item sai do menu. Reescrever para chamar diretamente a função que abre o modal (import do módulo `caixa-turno`), em vez de simular clique num botão de menu que não existe mais.
- Apresentação: overlay de tela cheia, mesmo padrão de `backdrop-filter` já reservado exclusivamente para modais (Seção 2.6, critério de aceite #8), card central com scroll interno se o conteúdo (revisão de fechamento com 3 seções: esperado/contado/diferença) ultrapassar a viewport.

**Correção (achado em uso real, 2026-08-23) — revogação da trava de fechamento do modal:** a primeira versão desta seção pedia bloquear X/Esc/clique-fora durante a revisão com impressão pendente. Na prática isso prendia o operador dentro do modal sempre que ainda não tinha imprimido (ex.: cliente chegou no meio da contagem e não dava pra sair pra vender) — inclusive dava a impressão de "nem fechando o caixa ele fecha", porque o clique em "Confirmar e fechar" enquanto ainda desabilitado (aguardando impressão) não faz nada e não avisa por quê. **Decisão:** nada é persistido no backend antes de "Confirmar e fechar" ter sucesso (`fecharTurno`) — a contagem/revisão inteira vive só em memória no navegador — então não há estado a proteger. X, Esc e clique fora do card **sempre** fecham o modal, em qualquer etapa (abertura, contagem, revisão, resumo). Se o operador fechar no meio de uma contagem/revisão, ela é descartada; reabrir o modal depois começa o fechamento do zero a partir de "Fechar caixa" (comportamento aceito explicitamente pelo usuário — simplicidade em vez de preservar rascunho). O requisito de impressão obrigatória (ou "Prosseguir sem impressão" após uma tentativa falha) continua existindo, mas só como condição para habilitar o botão "Confirmar e fechar" — não mais como trava de fechamento do modal em si.

**Não muda:**
- Nenhuma regra de negócio de abertura/fechamento (endpoints `/caixa-turno/*`, cálculo de diferença, obrigatoriedade de impressão do comprovante) muda — só o container de apresentação.
- `frontend/src/modules/fluxo-caixa/index.js` continua importando `caixa-turno/estado.js` e `caixa-turno/fechamento.js` diretamente (funções puras de estado/cálculo, não o módulo roteado) — não é afetado por essa mudança.

**Critério de aceite adicional:**
- Menu principal (`#menu-principal`) não tem mais item/botão "Caixa".
- De qualquer tela, clicar no indicador de turno do header abre o modal de caixa.
- Na tela Vendas com caixa fechado, o aviso "Abra o caixa para começar a vender" abre o modal diretamente (não depende mais de um item de menu).
- Fluxo completo de abertura e fechamento funciona dentro do modal exatamente como funcionava na tela própria — coberto pela suíte de testes de `caixa-turno` adaptada para montar em um container de modal em vez do container do roteador.
- X, Esc e clique fora do card fecham o modal em qualquer etapa (abertura, contagem, revisão, resumo), inclusive com "Confirmar e fechar" desabilitado aguardando impressão — nenhuma etapa trava o fechamento do modal.
- O botão "Confirmar e fechar" continua desabilitado até imprimir o comprovante (ou escolher "Prosseguir sem impressão" após uma tentativa falha) — essa regra vale só pra habilitar o botão, não pra impedir fechar o modal.
- Suíte completa de `frontend/` continua passando 100% depois da mudança.
