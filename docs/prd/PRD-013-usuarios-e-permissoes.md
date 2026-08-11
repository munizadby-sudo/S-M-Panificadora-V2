# PRD-013 — Usuários e Permissões (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Administração de usuários (RBAC)
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-admin` em `index.html` (`modal-user`, `perms-section`, `perm-caixa`, `perm-encomendas`, `perm-estoque`, `perm-fluxo`, `perm-produtos`, `perm-rel`), funções `abrirModalUser`, `abrirNovoUser`, `renderUsuarios`, `togglePermissoes`, `aplicarPermissoes` em `app.js`
- **Depende de:** PRD-001, PRD-002. Restrito a usuários com papel `admin`.

---

## 1. Objetivo

Permitir que o administrador crie, edite e desative usuários, definindo permissões granulares por módulo para o papel `operador` — mantendo o `admin` sempre com acesso irrestrito.

---

## 2. Contexto (V1)

- Listagem de usuários com modal de cadastro/edição.
- Bloco de permissões por módulo (`caixa`, `encomendas`, `estoque`, `fluxo`, `rel`, `produtos`), habilitado/desabilitado via `togglePermissoes`.
- `aplicarPermissoes` reflete as permissões do usuário logado na própria UI (esconder/mostrar módulos do menu).
- Exclusão é sempre soft delete (`ativo = 0`).

---

## 3. Requisitos funcionais

- Listagem de usuários (nome, username, papel, status ativo/inativo).
- Cadastro/edição: nome, username, senha (na criação; troca opcional na edição), papel (`admin`/`operador`).
- Quando o papel selecionado for `admin`, o bloco de permissões por módulo deve ficar desabilitado/oculto na UI, refletindo que o backend sempre concede acesso completo a admins independentemente do que for enviado — a UI não deve sugerir que é possível restringir um admin.
- Quando o papel for `operador`, exibir checkboxes de permissão por módulo (Caixa, Encomendas, Estoque, Fluxo, Relatórios, Produtos — e os novos módulos conforme forem sendo adicionados: Produção, Perdas, Clientes).
- Ação de desativar usuário deve ser bloqueada na UI quando o alvo for o próprio usuário logado, com mensagem explicativa (o backend já bloqueia; a UI deve evitar que o operador nem tente).
- Aplicação das permissões do usuário logado deve refletir imediatamente no menu do shell (PRD-001) após login.

---

## 4. Regras herdadas do V1 (mantidas)

- Admin sempre com permissões completas, não editável individualmente.
- Soft delete de usuário.
- Bloqueio de autodesativação.

---

## 5. Correções em relação ao V1

- Nenhuma correção estrutural necessária — este módulo é considerado maduro no V1; a V2 deve reproduzir o mesmo comportamento, apenas com a lista de módulos de permissão atualizada para incluir os módulos novos (Produção, Perdas, Clientes) previstos na ADR-001.

---

## 6. Fora de escopo desta fase

- Papéis customizados além de `admin`/`operador`.
- Autenticação de dois fatores para contas admin.

---

## 7. Critérios de aceite

1. Não é possível restringir permissões de um usuário `admin` pela UI.
2. Usuário logado não consegue desativar a própria conta.
3. Menu do shell reflete corretamente as permissões do usuário logado, imediatamente após login.
4. Lista de permissões por módulo inclui todos os módulos ativos do sistema, inclusive os novos.
