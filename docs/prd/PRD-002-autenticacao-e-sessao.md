# PRD-002 — Autenticação e Sessão (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Login, sessão, logout, guarda de rota
- **Referência/legado:** `S-M-Panificadora` (V1) — `frontend/login.html`, `frontend/js/auth.js`
- **Depende de:** PRD-001 (Fundação e Arquitetura do Frontend)

---

## 1. Objetivo

Permitir que o usuário entre no sistema com usuário/senha, mantenha sessão válida enquanto usa o sistema, e seja deslogado de forma segura quando o token expira ou ele opta por sair.

---

## 2. Contexto (V1)

- `login.html` é uma tela separada do shell principal, com campos de usuário/senha.
- Nome e logo da loja na tela de login são carregados via `sessionStorage` (cache local do navegador), **sem chamada autenticada** — ou seja, a personalização visual da tela de login só aparece depois que o usuário já logou uma vez naquele navegador; em navegador novo, aparece o padrão até o primeiro login.
- `auth.js` guarda o token e aplica permissões nos elementos da UI.

---

## 3. Requisitos funcionais

- Formulário de login com usuário e senha.
- Ao autenticar com sucesso: guardar token e dados do usuário (nome, papel, permissões), redirecionar para o shell principal.
- Ao falhar: exibir mensagem genérica de erro ("usuário ou senha incorretos"), sem indicar se o problema foi usuário inexistente ou senha errada (alinhado à regra de backend que evita enumeração de usuários).
- Botão de logout visível no shell, que limpa a sessão e volta para a tela de login.
- Acessar qualquer tela do shell sem sessão válida deve redirecionar automaticamente para login (guarda de rota, ver PRD-001).
- Exibir de forma visível o nome do operador logado e seu papel (admin/operador) dentro do shell.

---

## 4. Regras herdadas do V1 (mantidas)

- Mensagem de erro genérica para credenciais inválidas ou usuário inativo.
- Redirecionamento automático para login quando o token expira durante o uso.

---

## 5. Correções em relação ao V1

- **Personalização visual da tela de login** (nome/logo da loja) deve vir de um endpoint público de configuração básica, não depender de cache local de uma sessão anterior — hoje um navegador novo mostra os valores padrão até o primeiro login, o que é inconsistente.
- Nenhum dado sensível (senha, token bruto) deve aparecer em log de console do navegador em produção.

---

## 6. Fora de escopo desta fase

- Login social / SSO.
- Autenticação de dois fatores.
- "Lembrar-me" com sessão de longa duração — o padrão de expiração (12h) definido no backend é suficiente para o ciclo de operação diário da loja.

---

## 7. Critérios de aceite

1. Login com credenciais válidas leva ao shell autenticado.
2. Login com credenciais inválidas mostra mensagem genérica, sem detalhar o motivo.
3. Tela de login exibe nome/logo corretos mesmo em navegador novo, sem login prévio.
4. Token expirado durante o uso leva de volta ao login automaticamente, sem exigir ação manual do usuário além de logar novamente.
5. Logout limpa completamente a sessão local.
