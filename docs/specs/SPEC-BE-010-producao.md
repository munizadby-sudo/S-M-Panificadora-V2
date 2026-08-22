# SPEC-BE-010 — Produção

- **Status:** Rascunho para revisão
- **Data:** 2026-08-22
- **Módulo:** `src/modules/production`
- **Depende de:** ADR-001, SPEC-BE-001 (usuário executor e RBAC — permissão `producao`, já prevista na whitelist), SPEC-BE-004 (produto precisa existir), SPEC-BE-005 (`IncrementarProduzido`, Seção 4.7 — este módulo é o único consumidor dessa interface)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.5; `PRD-007-producao.md` (frontend)

---

## 1. Objetivo técnico

Especificar o registro de produção diária: cada lançamento vincula produto, quantidade, data e usuário responsável, e incrementa `produzido` no estoque do dia correspondente através de `IncrementarProduzido` (SPEC-BE-005, Seção 4.7) — nunca escrevendo direto na tabela `estoque_diario`.

Módulo novo em relação ao V1 — lá, o campo `produzido` do estoque era editado diretamente na tela de Estoque, sem registro de evento, sem saber quem produziu ou quando. Este módulo cria o rastro que faltava, sem tirar do usuário a possibilidade de fazer um ajuste manual pontual (isso continua existindo via `UpsertEstoque`, SPEC-BE-005 Seção 4.2, para correções administrativas).

---

## 2. Modelo de dados

### 2.1 Tabela `producao`

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `produto_id` | `INT` FK `produtos.id` | obrigatório |
| `data` | `DATE` | obrigatório |
| `quantidade` | `DECIMAL(10,3)` | obrigatório, > 0 |
| `usuario_id` | `INT` FK `usuarios.id` | obrigatório — sempre o usuário autenticado que registrou, nunca informado no corpo da requisição |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

Sem coluna `ativo`: um lançamento de produção, uma vez confirmado, não é editado nem removido nesta fase (ver Seção 6, Fora de escopo). Se um lançamento for feito por engano, a correção é um ajuste manual em Estoque (`UpsertEstoque`), auditado como tal — não uma operação deste módulo.

---

## 3. Camada de domínio

### 3.1 Entidade `Producao`

**Campos:** `id`, `produtoId`, `data`, `quantidade`, `usuarioId`, `criadoEm`.

**Invariantes:**
- `quantidade` deve ser maior que zero.
- `produtoId` e `usuarioId` são obrigatórios.

### 3.2 Exceções de domínio

- `QuantidadeInvalidaError` (400) — reaproveitada de `inventory/domain/erros.js` (mesma família de erro já usada por Estoque/Perdas).
- `ProdutoInativoError` (400) — reaproveitada de `inventory/domain/erros.js` (não é possível lançar produção para produto desativado).

---

## 4. Camada de aplicação

### 4.1 `CreateProducao(produtoId, data, quantidade, executor)`

**Fluxo (transação única):**
1. Busca produto — se não existir, `ProdutoNaoEncontradoError` (reaproveitada de `products/domain/erros.js`); se inativo, `ProdutoInativoError`.
2. Abre transação.
3. Chama `IncrementarProduzido(conexao, produtoId, data, quantidade)` (SPEC-BE-005, Seção 4.7).
4. Persiste o registro de produção, com `usuario_id = executor.id`.
5. Commit.
6. Audita `criar_producao`.

**Nota:** ao contrário de Perdas e Vendas, este fluxo nunca é bloqueado por saldo — `IncrementarProduzido` sempre soma. A única forma de falhar é produto inexistente/inativo ou `quantidade` inválida.

### 4.2 `ListProducao(filtros)`

Paginado. Filtros: `produto_id`, `data_inicio`, `data_fim`. Cada item retorna também o nome do usuário responsável (join com `usuarios`), nunca só o `usuario_id`.

---

## 5. Contratos de API

### 5.1 `POST /api/producao`

Requer token + permissão `producao`.

**Request**
```json
{ "produto_id": 12, "data": "2026-08-22", "quantidade": 40 }
```

**Response 200**
```json
{ "id": 5, "produto_id": 12, "data": "2026-08-22", "quantidade": 40, "usuario_id": 3 }
```

**Erros**

| Status | Quando |
|---|---|
| 400 | `quantidade` ≤ 0 |
| 400 | produto inativo |
| 404 | produto não existe |

### 5.2 `GET /api/producao`

Requer token + permissão `producao`. Paginado.

**Query:** `?produto_id=12&data_inicio=2026-08-01&data_fim=2026-08-22&page=1&limit=20`

**Response 200**
```json
{
  "data": [
    { "id": 5, "produto": "Pão Francês", "data": "2026-08-22", "quantidade": 40, "usuario": "Isadora Karem" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1, "hasPrevious": false, "hasNext": false }
}
```

---

## 6. Fora de escopo desta fase

- Edição ou exclusão de um lançamento de produção já confirmado — se necessário, a correção é feita via ajuste manual de Estoque (`UpsertEstoque`), não por este módulo (decisão herdada diretamente do PRD-007 frontend, Seção 6: este módulo cobre apenas o registro do realizado).
- Ficha técnica / consumo de insumos por receita.
- Planejamento ou meta de produção.

---

## 7. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Registro de produção | Inexistente — `produzido` editado direto na tela de Estoque, sem rastro | Evento próprio (`producao`), rastreável por usuário e horário, refletido em `estoque_diario` via `IncrementarProduzido` |

---

## 8. Critérios de aceite técnicos

1. Um lançamento de produção sempre incrementa corretamente o `produzido` do estoque do dia correspondente (consultável via `GET /api/estoque`, SPEC-BE-005).
2. Dois lançamentos de produção do mesmo produto no mesmo dia somam — o segundo nunca sobrescreve o primeiro.
3. Duas requisições simultâneas de produção do mesmo produto/dia resultam nos dois incrementos aplicados (testável com requisições concorrentes de verdade, ver SPEC-BE-005 critério 8).
4. `quantidade` ≤ 0 é rejeitada com 400, nenhum registro é criado.
5. Produto inativo é rejeitado com 400.
6. Todo lançamento fica associado ao `usuario_id` do executor autenticado, nunca a um valor enviado no corpo da requisição.
7. `GET /api/producao` retorna o nome do usuário responsável, não apenas o id.
