# PRD-001 — Fundação e Arquitetura do Frontend

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Fundação (shell da aplicação, navegação, comunicação com API)
- **Repositório:** `S-M-Panificadora-V2` (frontend ainda não iniciado)
- **Referência/legado:** `S-M-Panificadora` (V1) — `frontend/index.html`, `frontend/js/app.js`, `frontend/js/api.js`, `frontend/js/auth.js`, `frontend/js/utils.js`
- **Documentos relacionados:** `ADR-001-clean-code-solid.md` (V2), `PRD-backend-S-M-Panificadora-V2.md`

---

## 1. Objetivo

Definir a base técnica sobre a qual todas as telas do V2 serão construídas: como a aplicação carrega, como navega entre módulos, como fala com o backend, e como trata sessão expirada — antes de qualquer tela de negócio ser implementada.

Este é o módulo **pré-requisito** de todos os outros PRDs de frontend.

---

## 2. Contexto (V1)

O V1 é uma SPA simples, sem framework, sem build step:
- Um único `index.html` contém todas as "telas" como seções (`tela-caixa`, `tela-produtos`, `tela-estoque`, `tela-encomendas`, `tela-fluxo`, `tela-rel`, `tela-admin`, `tela-config`), alternadas via função `showTab()`.
- `login.html` é uma página separada, fora do shell autenticado.
- `api.js` centraliza as chamadas HTTP (`fetch`) para o backend.
- `auth.js` guarda o token e aplica permissões na UI.
- `app.js` concentra praticamente toda a lógica de tela (62KB, um único arquivo) — funciona, mas mistura renderização, regra de UI e chamada de API no mesmo escopo.
- Tudo roda direto no navegador, sem etapa de build, para funcionar em qualquer PC de loja.

---

## 3. Requisitos funcionais

### 3.1 Shell da aplicação
- Um layout autenticado (menu/tabs + área de conteúdo) que hospeda todos os módulos de negócio (PDV, Estoque, Produtos, Encomendas, Fluxo, Relatórios, Admin, Configurações).
- Navegação entre módulos sem recarregar a página inteira (troca de seção visível), preservando o padrão de leveza do V1.
- Menu deve exibir apenas os módulos para os quais o usuário logado tem permissão (RBAC aplicado na UI, além do backend).

### 3.2 Comunicação com a API
- Um único módulo de acesso HTTP centralizado (equivalente ao `api.js` do V1), responsável por:
  - montar a URL base da API;
  - anexar automaticamente o header `Authorization: Bearer <token>` em toda chamada autenticada;
  - tratar resposta 401 de forma centralizada (ver 3.3);
  - tratar erros de rede/servidor de forma consistente (mensagem amigável, sem stack trace na tela).
- Nenhuma tela deve montar `fetch()` diretamente fora deste módulo — evita duplicação de tratamento de erro e de header de autenticação.

### 3.3 Sessão e expiração
- Token e dados mínimos do usuário (nome, papel, permissões) mantidos em memória/armazenamento local do navegador.
- Qualquer resposta 401 do backend deve, de forma centralizada, limpar a sessão e redirecionar para a tela de login — sem exigir que cada tela implemente esse tratamento individualmente (correção em relação ao V1, onde esse comportamento existe mas está espalhado).

### 3.4 Estrutura de módulos (organização de código)
- Cada módulo de negócio (PDV, Estoque, Produtos, etc.) deve ter seus arquivos de renderização/lógica separados do módulo de outro — não um único arquivo `app.js` concentrando tudo, como no V1.
- Utilitários genéricos (formatação de moeda, data, debounce, etc.) ficam em um módulo compartilhado (`utils`), sem lógica de negócio.

---

## 4. Regras herdadas do V1 (mantidas)

- Sem framework pesado, sem build step obrigatório — continua sendo possível abrir e rodar em qualquer computador de loja.
- Consumo de API sempre via módulo central de `fetch`.
- Formatação de moeda/data centralizada em utilitários.

---

## 5. Correções em relação ao V1

- **Separação por módulo:** `app.js` único de 62KB concentrando lógica de todas as telas dificulta manutenção e viola o princípio de responsabilidade única (ADR-001). A V2 deve ter um arquivo/módulo por tela de negócio.
- **Tratamento de 401 centralizado**, não replicado tela a tela.
- **Guarda de rota explícita:** acessar o shell autenticado sem token válido deve redirecionar para login antes de qualquer chamada de API falhar — não depender de cada tela detectar isso por conta própria.

---

## 6. Fora de escopo desta fase

- Escolha de um framework de UI (React, Vue, etc.) — decisão a ser tomada em ADR própria caso a complexidade das telas justifique; por padrão, mantém-se a linha vanilla do V1.
- Internacionalização (sistema é mono-idioma, PT-BR).
- Modo offline / PWA.

---

## 7. Critérios de aceite

1. Existe um módulo central de chamadas HTTP, usado por todas as telas.
2. 401 em qualquer chamada limpa a sessão e redireciona para login, de um único ponto do código.
3. O menu principal só exibe módulos permitidos ao usuário logado.
4. Cada módulo de negócio tem seu próprio arquivo/pasta, sem lógica de outro módulo misturada.
5. A aplicação continua rodando sem etapa de build (abrir e usar).
