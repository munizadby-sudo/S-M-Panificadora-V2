# ADR-003 — Arquitetura de Fundação do Frontend

- **Status:** Aceita
- **Data:** 2026-08-22
- **Decisores:** Equipe do projeto
- **Escopo:** Frontend do `S-M-Panificadora-V2` — shell da aplicação, comunicação com a API, organização de módulos de código
- **Origem:** conteúdo extraído de `PRD-001-fundacao-e-arquitetura-do-frontend.md` após revisão de código do José (2026-08-18/20), que apontou que aquele documento descrevia decisão técnica de arquitetura, não comportamento de produto — regra geral: ADR decide tecnologia/arquitetura, PRD descreve comportamento observável sem citar implementação (ver `docs/adr/ADR-001-clean-code-solid.md` para o precedente de formato).

---

## 1. Contexto

O V1 é uma SPA sem framework e sem build step: um único `index.html` com todas as telas como seções alternadas via `showTab()`; `api.js` centraliza `fetch`; `auth.js` guarda token e aplica permissões na UI; `app.js` concentra praticamente toda a lógica de tela em um único arquivo de 62KB, misturando renderização, regra de UI e chamada de API no mesmo escopo.

O V2 precisa de uma base técnica sobre a qual todas as telas de negócio serão construídas, resolvendo a violação de responsabilidade única identificada no `app.js` do V1 (ADR-001), sem abrir mão da restrição operacional original: rodar em qualquer computador comum de loja, sem instalação nem etapa de build.

---

## 2. Decisão

**2.1 Sem framework de UI nesta fase.** Mantém-se a linha vanilla JS do V1, sem build step obrigatório. A adoção de um framework (React, Vue etc.) fica reservada para uma ADR própria, caso a complexidade futura das telas justifique.

**2.2 Módulo HTTP central único** (equivalente ao `api.js` do V1), responsável por:
- montar a URL base da API;
- anexar automaticamente o header `Authorization: Bearer <token>` em toda chamada autenticada;
- tratar resposta `401` de forma centralizada;
- tratar erros de rede/servidor de forma consistente.

Nenhuma tela deve montar `fetch()` diretamente fora deste módulo.

**2.3 Organização por módulo de negócio.** Cada módulo (PDV, Estoque, Produtos, Encomendas, Fluxo, Relatórios, Admin, Configurações) tem seus próprios arquivos de renderização/lógica, separados dos demais — não um único `app.js` concentrando tudo.

**2.4 Utilitários genéricos isolados.** Formatação de moeda, data, debounce etc. ficam em um módulo compartilhado (`utils`), sem lógica de negócio.

---

## 3. Justificativa

- Resolve diretamente a violação de responsabilidade única do `app.js` do V1 (62KB, um arquivo, três responsabilidades misturadas), conforme os princípios já adotados na ADR-001.
- Centralizar o módulo HTTP evita duplicar tratamento de erro e de header de autenticação em cada tela, e garante que o comportamento de sessão expirada (401) seja consistente em toda a aplicação — o comportamento observável correspondente está descrito no `PRD-001-fundacao-e-arquitetura-do-frontend.md`.
- Manter a aplicação sem build step preserva a proposta de valor original do V1: operar em um PC comum de loja, sem infraestrutura cara.

---

## 4. Alternativas consideradas

### 4.1 Manter um único arquivo `app.js` concentrando toda a lógica
**Não adotada.** É exatamente o problema que motiva esta ADR — alto acoplamento, difícil manutenção, viola responsabilidade única.

### 4.2 Adotar um framework de UI (React, Vue etc.) desde já
**Não adotada nesta fase.** Aumentaria a complexidade de build e a curva de adoção sem necessidade comprovada neste momento. Pode ser revisitada em ADR própria se a complexidade das telas de negócio justificar.

### 4.3 Vanilla JS com módulos ES nativos, HTTP centralizado e organização por domínio
**Adotada.** Resolve o problema de acoplamento do V1 sem introduzir build step nem dependência de framework.

---

## 5. Consequências

**Positivas**
- Manutenção mais fácil por módulo, sem um arquivo monolítico.
- Tratamento de sessão e erro de rede consistente em toda a aplicação.
- Menor acoplamento entre telas de negócio.

**Negativas**
- Mais arquivos do que uma implementação de arquivo único.
- Exige disciplina para não vazar `fetch()` direto fora do módulo HTTP central.

---

## 6. Relação com outros documentos

- `PRD-001-fundacao-e-arquitetura-do-frontend.md` — descreve o comportamento observável que esta arquitetura sustenta (navegação sem reload, sessão expirada redireciona para login, menu filtrado por permissão).
- `ADR-001-clean-code-solid.md` — princípios gerais de Clean Code/SOLID que esta ADR aplica especificamente à fundação do frontend.
- `PRD-002-autenticacao-e-sessao.md` — comportamento de login/logout que consome o módulo HTTP central e o tratamento de 401 aqui definidos.

---

## 7. Critérios para revisão

Esta ADR poderá ser revisada quando:
- a complexidade das telas justificar a adoção de um framework de UI;
- houver pressão de prazo para reintroduzir lógica concentrada fora da organização por módulo — isso não deve acontecer sem registro em nova ADR.
