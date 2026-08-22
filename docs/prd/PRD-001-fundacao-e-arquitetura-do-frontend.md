# PRD-001 — Fundação e Arquitetura do Frontend

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11 (revisado em 2026-08-22)
- **Módulo:** Fundação (shell da aplicação, navegação, sessão)
- **Repositório:** `S-M-Panificadora-V2` (frontend ainda não iniciado)
- **Referência/legado:** `S-M-Panificadora` (V1) — `frontend/index.html`, `frontend/js/app.js`, `frontend/js/api.js`, `frontend/js/auth.js`
- **Documentos relacionados:** `ADR-003-fundacao-e-arquitetura-do-frontend.md` (como a fundação é construída), `PRD-backend-S-M-Panificadora-V2.md`

---

## 1. Objetivo

Definir o que o usuário vê e experimenta na base da aplicação, antes de qualquer tela de negócio: como ele navega entre os módulos do sistema, quais módulos ele enxerga de acordo com sua permissão, e o que acontece quando sua sessão expira ou fica inválida.

Este é o módulo **pré-requisito** de todos os outros PRDs de frontend. A arquitetura técnica que sustenta este comportamento (organização de código, módulo HTTP central, ausência de framework) está descrita separadamente na `ADR-003-fundacao-e-arquitetura-do-frontend.md`.

---

## 2. Contexto (V1)

O V1 é uma SPA simples: um único `index.html` contém todas as "telas" como seções (`tela-caixa`, `tela-produtos`, `tela-estoque`, `tela-encomendas`, `tela-fluxo`, `tela-rel`, `tela-admin`, `tela-config`), alternadas sem recarregar a página. `login.html` é uma página separada, fora do shell autenticado. O menu já respeita as permissões do usuário logado.

---

## 3. Requisitos funcionais

### 3.1 Shell da aplicação
- Existe um layout autenticado único (menu/tabs + área de conteúdo) que hospeda todos os módulos de negócio (PDV, Estoque, Produtos, Encomendas, Fluxo, Relatórios, Admin, Configurações).
- Navegar entre módulos não recarrega a página inteira — a troca de seção é visível e imediata.
- O menu principal exibe apenas os módulos para os quais o usuário logado tem permissão.

### 3.2 Sessão e expiração
- Acessar qualquer tela do shell sem sessão válida redireciona automaticamente para a tela de login, antes de qualquer chamada à API falhar.
- Se a sessão expirar ou ficar inválida durante o uso (resposta de autenticação negada em qualquer chamada), o usuário é levado de volta à tela de login de forma consistente, em qualquer tela em que isso aconteça — sem precisar perceber um erro técnico na tela.

---

## 4. Regras herdadas do V1 (mantidas)

- Navegação entre módulos sem recarregar a página inteira.
- Aplicação continua rodando sem etapa de build — abre e usa direto em qualquer computador de loja.

---

## 5. Correções em relação ao V1

- **Tratamento de sessão expirada consistente:** no V1 esse comportamento existe, mas está implementado de forma espalhada, podendo divergir de tela para tela. Na V2, o usuário deve ter a mesma experiência (volta ao login) não importa em qual tela a sessão expirou.
- **Guarda de rota explícita:** acessar o shell autenticado sem sessão válida deve levar ao login antes de qualquer tela tentar carregar dados e falhar — não depois.

---

## 6. Fora de escopo desta fase

- Escolha de um framework de UI (React, Vue etc.) — ver `ADR-003-fundacao-e-arquitetura-do-frontend.md`.
- Internacionalização (sistema é mono-idioma, PT-BR).
- Modo offline / PWA.

---

## 7. Critérios de aceite

1. Sessão expirada ou inválida, em qualquer tela, leva o usuário de volta ao login de forma consistente.
2. O menu principal só exibe módulos permitidos ao usuário logado.
3. Acessar o shell sem sessão válida redireciona para login antes de qualquer tela tentar carregar dados.
4. A aplicação continua rodando sem etapa de build (abrir e usar).
