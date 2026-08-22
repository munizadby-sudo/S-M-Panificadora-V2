# SPEC-BE-009 — Clientes

- **Status:** Rascunho para revisão
- **Data:** 2026-08-18
- **Módulo:** `src/modules/customers`
- **Depende de:** ADR-001, SPEC-BE-001 (executor/RBAC)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.11
- **Consumido por:** SPEC-BE-010 (Encomendas) — vínculo opcional entre cliente e encomenda.

---

## 1. Objetivo técnico

Especificar o cadastro mínimo de clientes: nome e telefone, soft delete com reativação (mesmo padrão já validado em Produtos/Categorias — aprendemos da forma mais difícil, em ISSUE-005, que desativar sem caminho de volta é sempre um problema).

Módulo novo em relação ao V1 — lá, dados de cliente ficavam soltos, digitados dentro de cada encomenda, sem cadastro central.

---

## 2. Modelo de dados

### 2.1 Tabela `clientes`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `nome` | `VARCHAR(100)` | obrigatório |
| `telefone` | `VARCHAR(20)` | obrigatório |
| `ativo` | `TINYINT(1)` | padrão `1`; `0` = soft delete |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

**Decisão de default (a confirmar, como sempre):** adicionei um índice único em `telefone`, restrito a clientes **ativos** (mesmo mecanismo de coluna gerada usado em Produtos/Categorias — ver SPEC-BE-004, Seção 2.2, decisão final: nome único mesmo inativo). Aqui a decisão é a mesma linha: **telefone é identidade do cliente**, único mesmo com o registro antigo inativo — evita dois cadastros para a mesma pessoa por engano. Se dois clientes reais legitimamente compartilharem telefone (ex.: casal), isso pode incomodar na prática; se isso acontecer, é sinal pra revisitar essa regra.

```sql
UNIQUE KEY clientes_telefone (telefone)
```

---

## 3. Camada de domínio

### 3.1 Entidade `Cliente`
**Campos:** `id`, `nome`, `telefone`, `ativo`.

**Invariantes:**
- `nome` não pode ser vazio/só espaços.
- `telefone` não pode ser vazio — validação de formato mínima (dígitos, tamanho razoável), sem exigir um formato rígido de máscara (a padaria pode receber número de qualquer jeito digitado).

### 3.2 Exceções de domínio
- `TelefoneJaCadastradoError` (409)
- `ClienteNaoEncontradoError` (404)

---

## 4. Camada de aplicação

### 4.1 `CreateCliente(nome, telefone)`
Valida, verifica duplicidade de telefone entre ativos, persiste. Sem exigência de permissão especial além de autenticação — qualquer usuário autenticado pode cadastrar cliente (é uma ação de baixo risco, parte do fluxo natural de atender um pedido).

### 4.2 `UpdateCliente(id, nome, telefone)`
Mesma validação de duplicidade se o telefone mudar.

### 4.3 `DeactivateCliente(id)` / `ReactivateCliente(id)`
Soft delete e reativação, seguindo exatamente o padrão já estabelecido em Produtos/Categorias (SPEC-BE-004) — mesmo raciocínio, mesma estrutura, para não reintroduzir o mesmo gap do ISSUE-005 em outro módulo.

### 4.4 `ListClientes(filtros)`
Paginado, busca por `nome` ou `telefone`, filtro `ativo`.

---

## 5. Contratos de API

### 5.1 `GET /api/clientes`
Requer token (qualquer autenticado). Paginado.

**Query:** `?busca=maria&ativo=1&page=1&limit=20`

### 5.2 `POST /api/clientes`
Requer token (qualquer autenticado).

**Request**
```json
{ "nome": "Maria Souza", "telefone": "83999998888" }
```

**Erro**
| Status | Quando |
|---|---|
| 409 | telefone já cadastrado em cliente ativo |
| 400 | nome ou telefone vazio |

### 5.3 `PUT /api/clientes/:id`
Mesma validação de `POST`.

### 5.4 `DELETE /api/clientes/:id` (soft delete)
Requer token (qualquer autenticado) — desativar um cliente é ação de baixo risco, não exige `admin`.

### 5.5 `POST /api/clientes/:id/reativar`
Requer token (qualquer autenticado).

**Erro**
| Status | Quando |
|---|---|
| 409 | outro cliente ativo já usa esse telefone |

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Cadastro de cliente | Inexistente — dados digitados soltos em cada encomenda | Cadastro central, reaproveitável |

---

## 7. Critérios de aceite técnicos

1. Criar cliente com telefone já usado por outro cliente ativo retorna 409.
2. Desativar cliente não afeta encomendas históricas vinculadas a ele (a FK permanece válida mesmo com `ativo = 0`).
3. Reativar cliente reaplica a checagem de telefone duplicado.
4. `GET /api/clientes` busca corretamente por nome parcial ou telefone parcial.
