# SPEC-FE-014 — Usuários e Permissões (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-23
- **Módulo:** `frontend/src/modules/usuarios`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-BE-001 (contrato de API — já implementado, este SPEC só cobre a tela que faltava)
- **PRD de origem:** `PRD-013-usuarios-e-permissoes.md`

---

## 1. Objetivo técnico

Especificar a tela de administração de usuários: CRUD com papel (`admin`/`operador`), bloco de permissões granulares por módulo quando o papel é `operador` (oculto/desabilitado quando é `admin`), soft delete com bloqueio de autodesativação, e a filtragem do menu do shell pelas permissões do usuário logado — que já existe desde a SPEC-FE-001, mas é reafirmada aqui como critério de aceite porque é o efeito visível mais direto deste módulo.

**Tela restrita a `admin`** — mesmo padrão de visibilidade condicional por papel já usado em Funcionários (SPEC-FE-013).

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/usuarios/index.js
export default {
  id: 'usuarios',
  label: 'Usuários',
  icone: 'ti-user-cog',
  permissao: 'admin', // mesmo caso especial da SPEC-FE-013: admin-only por papel, não por
                       // permissão da whitelist — registrar condicionalmente no router
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Listagem de usuários
- Consumir `GET /api/usuarios` (SPEC-BE-001, Seção 6.2), paginado.
- Colunas: nome, username, papel, status (ativo/inativo).
- **Testável:** ver a listagem carregada de verdade.

### Passo 2 — Cadastro/edição com bloco de permissões condicional
- Modal com nome, username, senha (obrigatória na criação, opcional na edição — só envia o campo se preenchido), papel (`<select>` fixo `admin`/`operador`).
- **Quando `role = 'admin'` é selecionado, o bloco de checkboxes de permissão é ocultado (não só desabilitado)** — a UI não deve nem sugerir que dá pra restringir um admin, reflete a regra de que o backend sempre concede acesso completo a admin independente do enviado (PRD-013, Seção 3).
- **Quando `role = 'operador'`**, exibir um checkbox por módulo ativo do sistema: `caixa`, `encomendas`, `estoque`, `fluxo`, `rel`, `produtos`, `producao`, `perdas`, `clientes` — lista derivada da whitelist real do backend (`backend/src/modules/users/domain/permissoes.js`), não uma lista fixa desatualizada no frontend. Se um módulo novo ganhar permissão própria no futuro, este formulário deve poder ganhar o checkbox sem reescrever lógica, só atualizando a lista de módulos exibidos.
- Submeter via `POST /api/usuarios` (criação) ou `PUT /api/usuarios/:id` (edição).
- **Testável:** criar um operador com permissões específicas, e um admin (sem bloco de permissões visível), e confirmar que ambos batem com o que a API retorna depois.

### Passo 3 — Soft delete com bloqueio de autodesativação
- Ação "Desativar" por linha, com confirmação.
- **O próprio botão de desativar deve ficar desabilitado (não só falhar ao clicar) quando a linha for o usuário atualmente logado** — a UI evita a tentativa em vez de só repassar o erro do backend (PRD-013, Seção 3, critério de aceite 2).
- Submeter via `DELETE /api/usuarios/:id` (SPEC-BE-001, Seção 6.5).
- **Testável:** confirmar que a própria linha do usuário logado nunca tem o botão de desativar habilitado, e que desativar outro usuário funciona normalmente.

### Passo 4 — Reflexo imediato no menu do shell
- Não é uma tela nova — é uma verificação de que o comportamento já existente (`session.temPermissao`, SPEC-FE-001) continua correto à medida que módulos de permissão vão sendo adicionados: o menu do shell deve mostrar exatamente os módulos permitidos ao usuário logado, imediatamente após login, sem exigir refresh manual.
- **Testável:** logar como operador com permissões parciais e confirmar que o menu mostra só os módulos permitidos.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `ListaUsuarios` | Tabela paginada |
| `ModalUsuario` | Cadastro/edição com bloco de permissões condicional ao papel |
| `SeletorPermissoes` | Lista de checkboxes por módulo, derivada da whitelist real, reaproveitável se outra tela precisar no futuro |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `400` — permissão fora da whitelist | Não deveria ser alcançável (checkboxes fixos); tratar defensivamente |
| `409` — `username` já existe | Mensagem de negócio clara no campo, modal permanece aberto |
| `400` — autodesativação | Não deveria ser alcançável (botão desabilitado no Passo 3); tratar defensivamente se escapar |

---

## 6. Fora de escopo desta SPEC

- Papéis customizados além de `admin`/`operador` (já fora de escopo no PRD).
- Autenticação de dois fatores.
- Reset de senha via e-mail/SMS — troca de senha aqui é sempre feita por um admin editando o usuário.

---

## 7. Critérios de aceite técnicos

1. Selecionar papel `admin` no formulário oculta o bloco de permissões — nunca apenas desabilita mantendo visível.
2. A lista de módulos de permissão exibida bate exatamente com a whitelist real do backend, sem módulo faltando ou módulo inventado no frontend.
3. O botão de desativar a própria conta nunca fica clicável.
4. Username duplicado mostra mensagem de negócio sem fechar o modal, permitindo corrigir e reenviar.
5. Menu do shell reflete as permissões do usuário logado imediatamente após login, sem refresh manual.
