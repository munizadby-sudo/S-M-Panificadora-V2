# ADR-006 — Testes E2E de Navegador: Playwright

- **Status:** Aceita
- **Data:** 2026-08-27
- **Decisores:** Equipe do projeto
- **Escopo:** Frontend do `S-M-Panificadora-V2` — camada de teste que exercita a aplicação num navegador real (renderização, foco, teclado, janelas de impressão, integração frontend↔backend)
- **Origem:** conversa sobre adotar uma ferramenta de teste ponta a ponta (E2E). Foram avaliadas **Cypress** e **Playwright** (mais a alternativa de não adotar ferramenta dedicada). Esta ADR registra a decisão pela Playwright. As perguntas de **escopo da suíte** e **execução em CI** ficam deliberadamente em aberto (Seção 5) — a escolha da ferramenta não depende delas.

---

## 1. Contexto

Todos os testes em `frontend/tests/` rodam com `node --test` sobre um **ambiente simulado escrito à mão** (`frontend/tests/helpers/ambiente.js`): um `localStorage` em `Map`, um `location` falso e um `document` mínimo cujo `createElement` devolve objetos com um punhado de métodos. Não é jsdom — é um dublê ainda mais raso.

Isso cobre bem lógica de módulo, montagem de payload, roteamento, guarda de sessão e contratos de string de HTML. **Não cobre, e não tem como cobrir:** layout e CSS reais, ordem de foco e navegação por teclado (F1, setas na grade, Tab, Enter), `window.open` / janela de impressão de comprovante e prévia, scroll e viewport reais, e a aplicação servida por `servir.mjs` conversando com o backend Express de verdade.

O custo disso já apareceu: `ISSUE-001` e `ISSUE-006` (impressão abrindo janela em branco), `ISSUE-007` (setas da grade não respondem após busca com F1), `ISSUE-008` (seletor de cliente salta o scroll) e as regressões de foco da prévia — todas encontradas manualmente, em uso, não por teste automatizado.

**Restrições e requisitos:**

- **Sem build step obrigatório** no frontend de produção (ADR-003 §2.1). A ferramenta de teste pode ter dependências de dev próprias.
- **Cobertura exigida: Chromium + Firefox + WebKit.** O PDV pode rodar em balcão com Chrome/Edge, mas há intenção de uso em Mac/iPad (WebKit) e a comercialização da V2 amplia o parque de máquinas. Queremos os três motores desde o começo.
- **Já existe Playwright no repositório:** `demo/package.json` depende de `playwright@^1.62.1` (usado por `demo/gravar.mjs`). A equipe já teve contato com a API.
- Roda hoje em Windows; precisa rodar também em Linux se/quando entrar em CI.
- Sem orçamento para serviço pago de execução de testes nesta fase.

---

## 2. Decisão

Adotar **Playwright** (`@playwright/test`) como ferramenta de teste E2E de navegador do frontend.

- Pacote de dev em diretório próprio (`e2e/` na raiz ou `frontend/e2e/`), **separado** de `frontend/tests/`, que continua sendo `node --test`.
- Config com projetos para os três motores: `chromium`, `firefox`, `webkit`.
- A suíte sobe backend + `servir.mjs` (via `webServer` da config) contra um banco/seed de teste — estratégia de dados a definir na implementação.
- `demo/` mantém sua dependência `playwright` própria por ora; consolidar as duas numa versão única é item de ação, não bloqueio.

O **escopo** da suíte e a **execução em CI** são decisões abertas (Seção 5).

---

## 3. Justificativa

- **Requisito de navegadores.** Pediu-se Chromium + Firefox + WebKit. Playwright trata os três como iguais; Cypress trata WebKit como experimental. Isso sozinho decide.
- **A dor concreta é multi-janela.** Os bugs que mais escaparam (`ISSUE-001`, `ISSUE-006`, foco da prévia) envolvem `window.open` e janelas de impressão — o cenário em que o modelo de aba única do Cypress é mais fraco e o modelo de múltiplas páginas da Playwright é mais forte.
- **Custo de paralelismo.** Sem orçamento para serviço pago, o paralelismo grátis da Playwright mantém a suíte rápida conforme cresce; a alternativa grátis no Cypress é rodar em série.
- **Uma ferramenta só.** `demo/` já usa Playwright — adotá-la para teste mantém um único paradigma de automação de navegador no repositório.
- **O que se perde:** a experiência de aprendizado do Cypress é mais suave e o painel time-travel é mais didático. Mitigação: o modo `--ui` e o `trace viewer` da Playwright cobrem a maior parte disso, e o `codegen` reduz a barreira de escrever o primeiro teste.

---

## 4. Alternativas consideradas

### 4.1 Playwright

| Dimensão | Avaliação |
|---|---|
| Navegadores | Chromium + Firefox + WebKit nativos e de primeira classe |
| Multi-janela / impressão | Nativo (múltiplas páginas, popups, `window.open`, downloads) |
| Custo / paralelismo | Zero; paralelismo local e em CI sem serviço pago |
| Familiaridade | Já em uso em `demo/` |
| Depuração | `trace viewer` (ótimo para CI), modo `--ui`, `codegen` |

**Prós:** atende o requisito de três motores; lida bem com as janelas de impressão; paralelismo grátis; reaproveita conhecimento do `demo/`.
**Contras:** menos "mágica visual" durante a execução que o Cypress; baixar os três navegadores ocupa disco (~1 GB) e é um passo de setup a mais; API totalmente assíncrona exige um pouco mais de disciplina.

**Adotada.**

### 4.2 Cypress

| Dimensão | Avaliação |
|---|---|
| Navegadores | Chromium e Firefox OK; **WebKit apenas experimental** |
| Multi-janela / impressão | Fraco — um teste = uma aba; popups exigem gambiarra |
| Custo / paralelismo | Grátis só em série; paralelismo real exige Cypress Cloud (pago) |
| Familiaridade | Nenhuma no projeto |
| Depuração | Excelente durante o desenvolvimento (time-travel, snapshot por comando) |

**Prós:** melhor depuração interativa enquanto se escreve o teste; API de leitura mais fácil; comunidade grande.
**Contras:** WebKit experimental conflita com o requisito de §1; o modelo de uma aba por teste é fraco justamente no cenário de impressão que mais dói aqui; sem paralelismo grátis; `demo/` continuaria em Playwright de qualquer forma (duas ferramentas no repo).

**Não adotada.**

### 4.3 Não adotar ferramenta dedicada; expandir `node --test` com jsdom

**Prós:** nenhuma dependência nova, nenhum navegador para baixar, continuidade total com o que a equipe já escreve.
**Contras:** jsdom não é um navegador — não renderiza CSS, não implementa `window.open` de verdade, tem suporte parcial e problemático a foco e teclado. Não resolve nenhum dos problemas que motivam esta ADR e dá falsa sensação de cobertura.

**Não adotada.**

---

## 5. Decisões deixadas em aberto

A ferramenta é Playwright independentemente destas duas escolhas, que a equipe ainda precisa fazer.

### 5.1 Escopo da suíte

| Opção | Prós | Contras |
|---|---|---|
| **Poucos fluxos críticos** (~5–10 jornadas: login→venda→troco→comprovante, encomenda com sinal, abrir/fechar caixa, impressão de prévia) | Manutenção baixa; suíte rápida; foca nas classes de bug de `docs/issues/` | Cobertura estreita; telas fora das jornadas seguem sem E2E |
| **Cobertura ampla** (maioria das telas/fluxos) | Muito mais confiança antes de comercializar | Suíte lenta e mais frágil; manutenção alta; sobreposição grande com `frontend/tests/` |
| **Substituir `frontend/tests/`** aos poucos, aposentando o ambiente simulado | Um só nível de teste; acaba a manutenção do dublê de `document` | Troca testes rápidos e estáveis por outros lentos e frágeis; perde teste isolado de lógica; migração grande sem entregar funcionalidade |

### 5.2 Execução em CI

| Opção | Prós | Contras |
|---|---|---|
| **GitHub Actions a cada PR** | Regressão pega antes do merge; `trace` como artefato torna a falha depurável; alinha com a intenção de comercializar | Não há `.github/` no repo — CI do zero; runs mais longos; flakiness vira ruído se a suíte não for cuidada |
| **Só local por enquanto** | Zero infraestrutura nova; rápido de adotar | Depende de disciplina; sem barreira automática antes do merge |

---

## 6. Consequências

**Positivas**
- Cobertura automatizada das classes de bug que hoje só o teste manual pega (foco, teclado, janela de impressão, integração real com o backend).
- Cobertura real nos três motores desde o início.
- Um só paradigma de automação de navegador no repositório (`demo/` + testes).
- `codegen` e `trace viewer` baixam o custo de escrever e depurar testes.

**Negativas**
- Nova dependência de dev e ~1 GB de navegadores no setup (`npx playwright install`).
- Testes E2E são mais lentos e mais frágeis que os `node --test` atuais — exigem disciplina contra flakiness (esperas explícitas, seletores estáveis, dados isolados).
- Precisa de uma estratégia de dados/banco de teste ponta a ponta, que hoje não existe no frontend.
- Enquanto o CI não existir (Seção 5.2), a suíte só protege quem a roda.

**A revisitar**
- Consolidar a versão de Playwright entre `demo/` e a pasta de E2E.
- Fechar as decisões da Seção 5.
- Se um framework de UI for adotado (ADR-003 §7), reavaliar se testes de componente entram junto do E2E.

---

## 7. Relação com outros documentos

- `ADR-003-fundacao-e-arquitetura-do-frontend.md` — define o frontend vanilla sem build step; esta ADR adiciona a camada de teste E2E sem violar essa restrição.
- `ADR-004-seguranca-e-testabilidade-do-backend.md` — testabilidade de domínio sem infraestrutura real; o E2E é a camada complementar, que exercita a integração real que aquela deliberadamente não cobre.
- `docs/issues/ISSUE-001`, `ISSUE-006`, `ISSUE-007`, `ISSUE-008` — bugs de renderização/foco/impressão que motivam a adoção de teste de navegador real.
- `docs/issues/ISSUE-009-implementar-suite-e2e-playwright.md` — implementação desta ADR.
- `demo/gravar.mjs` — uso pré-existente de Playwright no repositório.

---

## 8. Critérios para revisão

Esta ADR poderá ser revisada se:
- a suíte E2E se mostrar cronicamente instável a ponto de o time ignorá-la — nesse caso, revisitar escopo (Seção 5.1), estratégia de dados, ou a própria ferramenta;
- a Playwright deixar de suportar bem algum dos três motores exigidos;
- surgir necessidade de execução paralela em escala que só um serviço pago atenda;
- um framework de UI for adotado (ADR-003 §7), trazendo a questão de testes de componente.
