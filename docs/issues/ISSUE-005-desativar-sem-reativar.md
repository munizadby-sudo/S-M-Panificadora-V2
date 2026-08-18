# ISSUE-005 — Desativar produto/categoria sem caminho de volta

- **Status:** Fechada — resolvida (2026-08-17)
- **Data:** 2026-08-17
- **Módulo:** `backend/src/modules/products` + `frontend/src/modules/produtos`
- **Severidade:** Alta (soft delete era irreversível na prática: item sumia da lista padrão e não havia API nem UI para reativar)
- **Relacionado:** SPEC-BE-004 Seções 4.2, 5.4.1 e 5.6.1; SPEC-FE-004 Passos 1 e 4; PRD-005
- **Fonte da verdade a partir de agora:** as SPECs (`SPEC-BE-004`, `SPEC-FE-004`), não esta issue. Este documento registra o histórico de como a decisão foi tomada; qualquer implementação futura deve seguir a SPEC, não este texto.

---

## 1. Sintoma

A SPEC original descrevia só desativação (`DELETE` = soft delete, `ativo = 0`). Depois de desativar:

1. O produto/categoria saía da listagem padrão (`ativo=1`).
2. Não existia `POST .../reativar`.
3. A UI não tinha **Mostrar inativos** nem botão **Reativar**.
4. Um desativar por engano não tinha desfazer. O registro continuava no banco, mas invisível para a gestão.

---

## 2. Causa

Omissão de spec, não bug de runtime: `DeactivateProduto` / `DeactivateCategoria` faziam o que estava escrito. Faltava o caso de uso inverso e o caminho de UI para achar o inativo.

---

## 3. Correção aplicada

Backend:

- `ReactivateProduto` / `ReactivateCategoria`.
- `POST /api/produtos/:id/reativar` e `POST /api/categorias/:id/reativar` (token + `admin`).
- `GET /api/produtos?ativo=0` e `GET /api/categorias?ativo=0` listam só inativos.
- Soft delete permanece: **Desativar** só marca `ativo = 0`. A linha não é apagada.

Frontend:

- Alternância **Mostrar inativos** (produtos e categorias), como toggle (cinza/verde).
- Botão **Reativar** nos inativos visíveis.
- Linha ativa com fundo verde, inativa com fundo vermelho.

---

## 4. Revisão de unicidade (mesmo dia) — decisão registrada

Uma primeira tentativa de correção soltou o nome ao desativar (único só entre **ativos**), via coluna gerada, permitindo criar um novo produto com o mesmo nome de um antigo inativo, e só bloqueando no **Reativar** (409).

Ao testar, isso se mostrou confuso: dois registros com o mesmo nome — um ativo, um inativo — sem forma óbvia de saber se representam o mesmo produto ou produtos diferentes.

**Decisão final, confirmada por Adby (dono do produto) em 2026-08-17, após avaliação conjunta com Claude:** o nome continua único na categoria **mesmo com o registro antigo inativo** — como era antes desta issue. Desativar "Pão Francês" em Massas e tentar cadastrar outro "Pão Francês" na mesma categoria → **409** na criação. O caminho de volta é **Reativar** o registro existente, nunca criar um segundo. Um produto genuinamente diferente deve ter um nome diferente (ex.: "Pão Francês Integral").

Mesmo nome em **categorias diferentes** continua permitido (não é unicidade global).

Índice final: `UNIQUE (categoria_id, nome)` em `produtos` e `UNIQUE (nome)` em `categorias`, cobrindo ativos e inativos.

Esta decisão está refletida em `SPEC-BE-004`, Seção 2.2, que é a referência oficial daqui em diante.

---

## 5. Nota de processo (para não se repetir)

Esta correção passou por uma versão intermediária (unicidade só entre ativos) que foi implementada e revertida **sem confirmação prévia do dono do produto** — o agente de implementação tomou a decisão sozinho e documentou como se já fosse aprovada. A decisão acabou correta no resultado final, mas o processo não deveria ter pulado a confirmação.

**Regra a partir de agora:** quando a implementação encontrar um conflito ou ambiguidade na SPEC que pareça exigir uma mudança de regra de negócio, o caminho é **propor e esperar confirmação** — nunca decidir e implementar silenciosamente, mesmo documentando depois.

---

## 6. Teste permanente (canário)

Backend:

- `backend/tests/products/produtos.http.test.js` — desativa → `ativo=0` → reativa → volta em `ativo=1`; criar produto com o mesmo nome de um inativo na mesma categoria retorna 409
- `backend/tests/products/categorias.http.test.js` — mesmo fluxo de reativar; criar categoria com o mesmo nome de uma inativa retorna 409

Frontend:

- `frontend/tests/produtos/passo1.test.js` — toggle **Mostrar inativos**
- `frontend/tests/produtos/passo2.test.js` — categorias inativas exibem **Reativar** e classe de inativo
- `frontend/tests/produtos/passo4.test.js` — fluxo incremental: some da lista padrão, reaparece com inativos e volta ao reativar; linha ativa/inativa com classes de cor

**Pendente de confirmação:** o total de testes reportado (backend 52/52, frontend 90/90) ainda precisa ser confirmado com o log bruto de `npm.cmd test`, não só o resumo — ver ISSUE-001 para o histórico de por que essa confirmação é necessária.
