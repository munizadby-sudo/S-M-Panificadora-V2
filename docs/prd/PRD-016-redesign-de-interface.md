# PRD-016 — Redesign de Interface (Frontend)

- **Status:** Em execução (onda de polish 2026-08-23)
- **Data:** 2026-08-23 (atualizado 2026-08-28 — layout que se adapta à largura da janela)
- **Módulo:** Diretrizes de interface aplicáveis a **todo** o frontend — do login ao último modal
- **Referência visual (só olhar, não copiar código):** `C:\Users\Panificadora S&M\Desktop\Sistema-Padaria-Docker\padaria-pdv` (`frontend/css/style.css`, `frontend/login.html`, `frontend/index.html`)
- **Referência de auditoria:** artifact ["Redesign do PDV — S&M Panificadora"](https://claude.ai/code/artifact/58087395-4497-462c-b7af-1d9950010e9d)
- **Depende de:** PRD-001 (Fundação e Arquitetura do Frontend — vanilla JS/sem build, ver ADR-003), PRD-002 (Autenticação e Sessão)
- **Especificação técnica:** `docs/specs/SPEC-FE-015-design-system.md`

---

## 1. Objetivo

Elevar a consistência e a usabilidade da interface já em produção, corrigindo problemas concretos identificados por auditoria (não uma reformulação estética por preferência) — sem trocar a base técnica do frontend (continua vanilla JS, sem build step, ver ADR-003).

**Onda atual (2026-08-23):** polish visual **do sistema inteiro** (login → shell → módulos → modais), com tom **clean mínimo**, usando o `padaria-pdv` apenas como referência de aparência. Lógica de negócio, APIs e correções do V1 (ex.: faixa dinâmica de horas em Relatórios, ausência do KPI “Descontos” vazio) **permanecem**.

---

## 2. Contexto

O sistema já tem identidade visual escura com laranja/âmbar como cor de marca no shell (`index.html`). O `login.html` ainda estava na paleta clara legada — alinhar ao tema escuro faz parte desta onda. Uma auditoria estruturada encontrou 9 problemas concretos (cor, tipografia, contraste, navegação, estado vazio, feedback), detalhados no artifact de referência.

**Decisões confirmadas:**
- (2026-08-23) PDV continua teclado/mouse como fluxo principal de venda — não vira POS de toque.
- (2026-08-28) Layout se adapta à largura da janela (tablet, celular, PC redimensionado): empilha painéis, menu rola na horizontal, tabelas e modais cabem sem cortar. Toque pontual em botões/menu é consequência do layout, não um PDV redesenhado para dedo.
- (2026-08-23) Tom visual: **clean mínimo** (pouco ruído, tipografia clara, espaço consistente).
- (2026-08-23) Escopo: **sistema todo**; ordem de rollout no SPEC-FE-015 (fases 0–7).
- (2026-08-23) Limites: só apresentação (CSS/HTML de template); sem backend; sem Google Fonts; sem lib de gráfico; sem importar código do `padaria-pdv`.

---

## 3. Requisitos funcionais

### 3.1 Cor com significado único
Cada cor do sistema deve comunicar **um e só um** conceito, nunca dois papéis diferentes na mesma tela:
- Uma cor para ação de sucesso/confirmação (ex.: finalizar venda, abrir caixa).
- Uma cor **diferente** para "isso está selecionado/ativo agora" (ex.: forma de pagamento escolhida no modal).
- Uma cor exclusiva para perigo/encerramento (ex.: fechar caixa, cancelar).
- A cor de marca (ações primárias como Salvar, Nova Encomenda) nunca deve ser reaproveitada para os três papéis acima.

### 3.2 Estado de seleção sempre perceptível
Qualquer elemento selecionável (card de produto, linha de tabela, opção de formulário) deve ter diferença visual clara entre "disponível" e "selecionado" — perceptível numa leitura rápida. Crítico na grade do PDV.

### 3.3 Hierarquia tipográfica consistente entre telas
Toda tela segue a mesma escala de tamanhos/pesos para os mesmos tipos de conteúdo (título de módulo, rótulo de campo, texto de apoio).

### 3.4 Legibilidade em ambiente de loja
Todo texto, incluindo secundário, permanece legível com luz forte na tela — contraste WCAG AA e tamanho mínimo nas telas operacionais diárias (Caixa, Encomendas, Estoque, Fluxo). Telas administrativas ocasionais têm exigência relaxada.

### 3.5 Peso visual proporcional à importância da informação
Status persistente (ex.: banner de caixa) informa sem competir com a ação principal da tela.

### 3.6 Navegação agrupada por frequência de uso
Distinguir visualmente módulos operacionais diários dos administrativos ocasionais.

### 3.7 Ajuda progressiva para atalhos de teclado
Atalhos do PDV sob demanda (expansível), não ocupando espaço fixo permanente no fluxo de venda.

### 3.8 Navegação por teclado explícita e documentada
Comportamento de setas na grade de produtos especificado formalmente (ordem, Tab/Enter/Esc).

### 3.9 Estado vazio orientado à ação
Listagem vazia explica o que aparece ali e reforça a ação principal (ex.: cadastrar o primeiro registro).

### 3.10 Feedback mínimo em campos sensíveis
Campos de senha em formulários administrativos dão feedback visual mínimo de preenchimento — sem política de senha complexa.

### 3.11 Tema único login ↔ app
Login e shell compartilham a mesma família de tokens (tema escuro + âmbar). Não há tela “clara legada” no fluxo principal.

### 3.12 Layout que se adapta à largura da janela
Em janela estreita o conteúdo permanece usável: header e menu não empurram a página para o lado; grades de duas colunas empilham; tabelas largas rolam **dentro** da tabela; modais cabem na viewport com scroll interno. O PDV continua o mesmo fluxo de teclado (F1–F10, setas, Enter/Esc); só o arranjo visual muda.

---

## 4. Regras herdadas (mantidas)

- Tema escuro como identidade visual de base — este PRD refina, não substitui.
- Âmbar/laranja como cor de marca e ação primária.
- Operação por atalhos de teclado como fluxo principal do PDV (F1–F10, setas, Enter/Esc).
- Ausência de build step / framework — ADR-003 permanece válida.

---

## 5. Correções em relação à versão atual

| Achado | Correção |
|---|---|
| Verde com dois significados (sucesso e seleção) | Cor própria para "selecionado" (Seção 3.1) |
| Seleção de card pouco perceptível | Estado selecionado com diferença visual forte (Seção 3.2) |
| Tipografia inconsistente | Escala tipográfica única (Seção 3.3) |
| Contraste/tamanho baixo em texto de apoio | WCAG AA + tamanho mínimo operacional (Seção 3.4) |
| Banner competindo com ação principal | Reduzir peso do status persistente (Seção 3.5) |
| Navegação em fileira única | Agrupar operacional vs. administrativo (Seção 3.6) |
| Legenda de atalhos sempre visível | Sob demanda (Seção 3.7) |
| Navegação por teclado não documentada | Especificar formalmente (Seção 3.8) |
| Estado vazio sem orientação | Explicação + próximo passo (Seção 3.9) |
| Sem feedback no campo de senha | Feedback mínimo (Seção 3.10) |
| Login ainda na paleta clara | Alinhar tokens ao tema escuro (Seção 3.11) |
| Janela estreita corta conteúdo / força scroll da página | Layout que se adapta (Seção 3.12) |

---

## 6. Fora de escopo desta fase

- PDV touch-first (botões grandes de POS, grade só para dedo, abandono de atalhos). Layout estreito (Seção 3.12) não implica redesenhar a venda para toque.
- Troca da base técnica do frontend (framework, build step) — ADR-003.
- Importar/copiar código do `padaria-pdv`.
- Reintroduzir bugs corrigidos do V1 (faixa fixa 6h–19h; KPI “Descontos”/“Resumo” sem dado).
- Bibliotecas de gráfico / Google Fonts / UI dependente de internet.
- Mudança de regras de negócio, contratos de API ou fluxos (só aparência e templates).

**Nota:** telas antes “não auditadas” (Estoque, Perdas, Produção, Fluxo, Relatórios, Config, Funcionários) **entram no escopo desta onda** via tokens/componentes globais (SPEC-FE-015 fases 0–7), sem redesenhar regra de negócio.

---

## 7. Critérios de aceite

1. Nenhuma cor do sistema comunica dois significados diferentes na mesma tela.
2. Elemento selecionado é distinguível do não selecionado em leitura rápida (< 1 s).
3. Texto secundário em telas operacionais atende contraste WCAG AA e tamanho mínimo.
4. Menu distingue visualmente módulos operacionais de administrativos.
5. Legenda de atalhos não ocupa espaço fixo permanente no PDV.
6. Todo estado vazio de listagem inclui frase orientando o próximo passo.
7. Navegação por teclado na grade segue comportamento documentado e testável.
8. `login.html` e `index.html` compartilham a mesma família de tokens (tema escuro + âmbar).
9. Suíte `frontend/` (`npm test`) permanece 100% verde após cada fase do SPEC-FE-015.
10. Em viewport ~390px o shell não gera scroll horizontal da página; PDV empilha grade e carrinho; login continua centralizado e legível.
