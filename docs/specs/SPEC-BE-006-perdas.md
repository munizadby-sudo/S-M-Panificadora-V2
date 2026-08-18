# SPEC-BE-006 — Perdas

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `src/modules/losses`
- **Depende de:** ADR-001, SPEC-BE-001 (usuário executor e RBAC), SPEC-BE-004 (produto), SPEC-BE-005 (`DebitarEstoque`/`ReverterDebito` — este módulo é o primeiro a consumir essa interface de verdade)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.10

---

## 1. Objetivo técnico

Especificar o registro de quebra/perda de produto, com motivo restrito a whitelist, custo calculado automaticamente, e — a correção mais importante em relação ao V1 — **débito real do estoque disponível**, usando a interface `DebitarEstoque` já especificada na SPEC-BE-005.

Este módulo é o "ensaio" mais simples da transação que Vendas (SPEC-BE-007) vai replicar em maior escala: debitar estoque **e** persistir um registro, tudo atômico.

---

## 2. Modelo de dados

### 2.1 Tabela `perdas`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `produto_id` | `INT` FK `produtos.id` | obrigatório |
| `data` | `DATE` | obrigatório |
| `quantidade` | `DECIMAL(10,3)` | obrigatório, > 0 |
| `motivo` | `ENUM('queimado','vencido','danificado','sobra')` | obrigatório, whitelist fechada |
| `custo_calculado` | `DECIMAL(10,2)` | **snapshot** de `produto.custo × quantidade` no momento do registro — nunca recalculado depois, mesmo que o custo do produto mude |
| `usuario_id` | `INT` FK `usuarios.id` | obrigatório |
| `ativo` | `TINYINT(1)` | padrão `1`; `0` = estornada (soft delete) |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

**Por que `custo_calculado` é um snapshot, não uma referência ao custo atual do produto:** se o custo do Pão Francês mudar mês que vem, uma perda registrada hoje não pode "mudar de valor" retroativamente — isso distorceria relatórios históricos.

---

## 3. Camada de domínio

### 3.1 Entidade `Perda`
**Campos:** `id`, `produtoId`, `data`, `quantidade`, `motivo`, `custoCalculado`, `usuarioId`, `ativo`.

**Invariantes:**
- `quantidade` deve ser maior que zero.
- `motivo` deve pertencer à whitelist — nunca texto livre.
- `custoCalculado` é sempre derivado (`produto.custo × quantidade`), a entidade não aceita esse valor vindo de fora, só calcula internamente.

### 3.2 Exceções de domínio
- `MotivoInvalidoError` (400)
- `QuantidadeInvalidaError` (400)
- `PerdaNaoEncontradaError` (404)

---

## 4. Camada de aplicação

### 4.1 `CreatePerda(produtoId, data, quantidade, motivo, executor)`
**Fluxo (transação única):**
1. Valida `motivo` contra a whitelist.
2. Busca produto — se inativo, `ProdutoInativoError` (reaproveitada da SPEC-BE-005).
3. Abre transação.
4. Chama `DebitarEstoque(conexao, produtoId, data, quantidade)` (SPEC-BE-005, Seção 4.4) — se o estoque for insuficiente, propaga `EstoqueInsuficienteError` (400) e a transação inteira é revertida, nenhuma perda é criada.
5. Calcula `custo_calculado = produto.custo × quantidade`.
6. Persiste a perda.
7. Commit.
8. Audita `criar_perda`.

**Nota importante:** perda **também** é bloqueada por falta de estoque — não dá pra "perder" mais do que existe disponível. Isso é consistente com a mesma regra que vai valer para Vendas.

### 4.2 `EstornarPerda(perdaId, executor)`
Restrito a `admin` (mesmo padrão de cancelamento de venda — reverter dinheiro/estoque é sempre ação de admin).

**Fluxo (transação única):**
1. Busca a perda — se não existir ou já estiver `ativo = 0`, `PerdaNaoEncontradaError`.
2. Chama `ReverterDebito(conexao, produtoId, data, quantidade)` (SPEC-BE-005, Seção 4.5) — **usando a `data` original da perda**, nunca a data de hoje.
3. Marca `ativo = 0`.
4. Commit.
5. Audita `estornar_perda`.

**Nunca remove fisicamente** — o registro de perda estornada continua consultável, só marcado como inativo.

### 4.3 `ListPerdas(filtros)`
Paginado. Filtros: `produto_id`, `motivo`, `data_inicio`, `data_fim`, `ativo` (padrão: só ativas).

---

## 5. Contratos de API

### 5.1 `POST /api/perdas`
Requer token + permissão `perdas`.

**Request**
```json
{ "produto_id": 12, "data": "2026-08-17", "quantidade": 5, "motivo": "queimado" }
```

**Response 200**
```json
{ "id": 8, "produto_id": 12, "data": "2026-08-17", "quantidade": 5, "motivo": "queimado", "custo_calculado": 1.50 }
```

**Erros**
| Status | Quando |
|---|---|
| 400 | `motivo` fora da whitelist |
| 400 | `quantidade` ≤ 0 |
| 400 | estoque insuficiente para a quantidade informada |
| 404 | produto não existe |

### 5.2 `GET /api/perdas`
Requer token + permissão `perdas`. Paginado.

**Query:** `?produto_id=12&motivo=queimado&data_inicio=2026-08-01&data_fim=2026-08-17&page=1&limit=20`

**Response 200**
```json
{
  "data": [
    { "id": 8, "produto": "Pão Francês", "data": "2026-08-17", "quantidade": 5, "motivo": "queimado", "custo_calculado": 1.50, "usuario": "Isadora Karem" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1, "hasPrevious": false, "hasNext": false }
}
```

### 5.3 `DELETE /api/perdas/:id` (estorno)
Requer token + `admin`.

**Response 200**
```json
{ "mensagem": "Perda estornada. Estoque revertido." }
```

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Perda afeta estoque | Registro contábil paralelo, **não debitava** o saldo mostrado em Estoque | Debita via `DebitarEstoque`, saldo sempre reflete a realidade |
| Permissão de exclusão | Sem controle específico | Restrita a `admin`, com estorno (nunca remoção física) |
| Custo da perda | — | Sempre snapshot no momento do registro, nunca recalculado depois |

---

## 7. Critérios de aceite técnicos

1. Criar uma perda reduz corretamente o `disponivel` do produto naquele dia (consultável via `GET /api/estoque`, SPEC-BE-005).
2. Criar uma perda com quantidade maior que o disponível é bloqueada, e nenhuma perda parcial é criada.
3. `motivo` fora da whitelist retorna 400, nunca é aceito como texto livre.
4. `custo_calculado` de uma perda antiga não muda mesmo que o custo do produto seja alterado depois.
5. Estornar uma perda devolve exatamente a quantidade ao estoque **do dia original** da perda, não ao estoque de hoje.
6. Perda estornada nunca é removida do banco — continua consultável com `ativo = 0`.
7. Apenas `admin` consegue estornar; usuário com permissão `perdas` mas não-admin recebe 403 ao tentar.
