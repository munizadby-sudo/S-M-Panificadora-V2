# SPEC-BE-004 — Produtos e Categorias

- **Status:** Rascunho para revisão
- **Data:** 2026-08-16
- **Módulo:** `src/modules/products`
- **Depende de:** ADR-001, SPEC-BE-001 (usuário executor e RBAC)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.3
- **Consumido por:** SPEC-BE-005 (Estoque), SPEC-BE-006 (Perdas), SPEC-BE-007 (Vendas) — todos referenciam produto por `id`.

---

## 1. Objetivo técnico

Especificar o catálogo de produtos e categorias: cadastro, edição, soft delete, e a regra nova de unicidade de nome por categoria (PRD backend §4.3) que o V1 não tinha.

---

## 2. Modelo de dados

### 2.1 Tabela `categorias`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `nome` | `VARCHAR(60)` | obrigatório, único (ativos e inativos — ver Seção 2.2) |
| `ativo` | `TINYINT(1)` | padrão `1`; `0` = soft delete |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

### 2.2 Tabela `produtos`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `nome` | `VARCHAR(100)` | obrigatório |
| `categoria_id` | `INT` FK `categorias.id` | obrigatório |
| `icone` | `VARCHAR(10)` | emoji/identificador visual, opcional |
| `preco` | `DECIMAL(10,2)` | obrigatório, > 0 |
| `custo` | `DECIMAL(10,2)` | obrigatório, ≥ 0 (usado em margem e em Perdas — SPEC-BE-006) |
| `ativo` | `TINYINT(1)` | padrão `1`; `0` = soft delete |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

**Índice único:** `(categoria_id, nome)` — cobre produtos **ativos e inativos**.

> **Histórico da decisão:** em 2026-08-17, uma primeira tentativa de correção (ISSUE-005) soltou essa regra para "único apenas entre ativos", via coluna gerada, permitindo criar um produto novo com o mesmo nome de um antigo inativo. Ao testar, isso se mostrou confuso na prática — dois registros com o mesmo nome, um ativo e um inativo, sem forma óbvia de saber se são "o mesmo produto" ou produtos diferentes. **Decisão confirmada pelo dono do produto (Adby, 2026-08-17): nome é a identidade do produto — permanece único na categoria mesmo com o antigo inativo.** O caminho de volta é sempre `ReactivateProduto` (Seção 4.2), nunca um novo cadastro. Um produto genuinamente diferente deve ter um nome diferente (ex.: "Pão Francês Integral").

---

## 3. Camada de domínio

### 3.1 Entidade `Produto`
**Campos:** `id`, `nome`, `categoriaId`, `icone`, `preco`, `custo`, `ativo`.

**Invariantes:**
- `preco` deve ser maior que zero.
- `custo` não pode ser negativo (pode ser zero, mas não negativo).
- `nome` não pode ser vazio/só espaços.

### 3.2 Entidade `Categoria`
**Campos:** `id`, `nome`, `ativo`.

**Invariante:** `nome` não pode ser vazio/só espaços.

### 3.3 Exceções de domínio
- `NomeDuplicadoNaCategoriaError` (409) — produto com mesmo nome já existe na mesma categoria.
- `CategoriaJaExisteError` (409) — nome de categoria duplicado.
- `PrecoInvalidoError` (400)
- `ProdutoNaoEncontradoError` (404) / `CategoriaNaoEncontradaError` (404)

---

## 4. Camada de aplicação

### 4.1 Casos de uso de Categoria
`CreateCategoria`, `UpdateCategoria`, `DeactivateCategoria` (soft delete) — seguem o mesmo padrão do SPEC-BE-001 (nunca `DELETE` físico).

### 4.2 Casos de uso de Produto
`CreateProduto`: valida categoria existente e ativa, valida unicidade de nome na categoria (verificação de aplicação + índice único de banco como rede de segurança contra concorrência), persiste.
`UpdateProduto`: mesma validação; se a categoria mudar, reaplica a checagem de unicidade na nova categoria.
`DeactivateProduto`: soft delete — **nunca remove o produto**, mesmo que ele tenha vendas/estoque/perdas associados (é exatamente por isso que soft delete existe: preservar histórico, conforme PRD backend §4.3).
`ReactivateProduto`: reverte `ativo` para `1`. Como o nome é único na categoria independentemente de estar ativo ou inativo (Seção 2.2), **não existe cenário de conflito na reativação** — se o produto existe inativo com aquele nome, nenhum outro produto ativo pode ter sido criado com o mesmo nome enquanto ele estava inativo (a criação já teria sido bloqueada por 409). A reativação é sempre uma operação simples e direta.
`ListProdutos`: paginado, com filtro por `categoria_id`, por `ativo`, e busca textual por `nome`.

---

## 5. Contratos de API

### 5.1 `GET /api/produtos`
Requer token (qualquer autenticado). Paginado.

**Query:** `?categoria_id=3&ativo=1&busca=pao&page=1&limit=20`

**Response 200**
```json
{
  "data": [
    { "id": 12, "nome": "Pão Francês", "categoria_id": 3, "icone": "🥖", "preco": 0.75, "custo": 0.30, "ativo": 1 }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1, "hasPrevious": false, "hasNext": false }
}
```

### 5.2 `POST /api/produtos`
Requer token + permissão `produtos`.

**Request**
```json
{ "nome": "Pão Francês", "categoria_id": 3, "icone": "🥖", "preco": 0.75, "custo": 0.30 }
```

**Erros**
| Status | Quando |
|---|---|
| 400 | preço ≤ 0, custo negativo, ou nome vazio |
| 404 | `categoria_id` não existe |
| 409 | já existe produto com esse nome nessa categoria |

### 5.3 `PUT /api/produtos/:id`
Mesma validação de `POST`.

### 5.4 `DELETE /api/produtos/:id` (soft delete)
Requer token + `admin`.

### 5.4.1 `POST /api/produtos/:id/reativar`
Requer token + `admin`. Não há cenário de erro 409 aqui — ver justificativa na Seção 4.2.

**Response 200**
```json
{ "mensagem": "Produto reativado." }
```

**Erro**
| Status | Quando |
|---|---|
| 404 | `id` não corresponde a nenhum produto |

### 5.5 `GET /api/categorias`
Requer token (qualquer autenticado). **Aceita `?ativo=0` para listar categorias desativadas** (mesmo padrão de `GET /api/produtos`, Seção 5.1) — necessário para a tela de gestão poder mostrar e reativar itens desativados.

### 5.6 `POST /api/categorias`
Requer token + permissão `produtos`.

**Erro**
| Status | Quando |
|---|---|
| 409 | nome de categoria já existe |

### 5.6.1 `POST /api/categorias/:id/reativar` *(novo em 2026-08-17)*
Requer token + `admin`.

### 5.7 `DELETE /api/categorias/:id` (soft delete)
Requer token + `admin`.

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Nome duplicado na mesma categoria | Permitido silenciosamente | Rejeitado com 409, reforçado por índice único de banco |
| Log de depuração em rotas de produto | `console.log` de payload completo ativo em produção | Removido — nenhum log de payload completo em produção (PRD backend §4.3) |
| Exclusão de produto/categoria | Soft delete (já correto no V1) | Mantido |

---

## 7. Critérios de aceite técnicos

1. Criar dois produtos com o mesmo nome em categorias diferentes funciona sem erro.
2. Criar dois produtos com o mesmo nome na mesma categoria retorna 409, mesmo sob requisições concorrentes (índice único de banco, não só checagem de aplicação).
3. Desativar um produto que já tem vendas associadas não falha e não remove o produto — só marca `ativo = 0`.
4. `PUT` que muda a categoria de um produto reaplica a checagem de unicidade na categoria de destino.
5. Nenhuma rota deste módulo grava log com o corpo completo da requisição em produção.
6. Desativar "Pão Francês" e tentar criar um novo "Pão Francês" na mesma categoria retorna 409 — o nome permanece reservado mesmo com o original inativo.
7. Reativar um produto nunca retorna 409 — a operação sempre é bem-sucedida se o `id` existir.
