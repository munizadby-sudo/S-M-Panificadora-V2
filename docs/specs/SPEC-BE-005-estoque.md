# SPEC-BE-005 — Estoque

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `src/modules/inventory`
- **Depende de:** ADR-001, ADR-002 (Decisão 1 — mínimo é informativo), SPEC-BE-001 (usuário executor), SPEC-BE-004 (produto precisa existir)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.4
- **Consumido por:** SPEC-BE-006 (Perdas) e SPEC-BE-007 (Vendas) — ambos debitam estoque através deste módulo, nunca escrevendo direto na tabela.

---

## 1. Objetivo técnico

Especificar o controle de saldo diário por produto: a fórmula `disponível = inicial + produzido − vendido`, o rollover automático do saldo de um dia pro outro, e a interface de débito que Vendas e Perdas vão usar — sempre dentro de transação, sempre com proteção contra condição de corrida.

---

## 2. Modelo de dados

### 2.1 Tabela `estoque_diario`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `produto_id` | `INT` FK `produtos.id` | obrigatório |
| `data` | `DATE` | obrigatório |
| `inicial` | `DECIMAL(10,3)` | padrão `0`, ≥ 0 |
| `produzido` | `DECIMAL(10,3)` | padrão `0`, ≥ 0 |
| `vendido` | `DECIMAL(10,3)` | padrão `0`, ≥ 0 — **nunca editado manualmente**, só via `DebitarEstoque`/`ReverterDebito` |
| `minimo` | `DECIMAL(10,3)`, nulo | opcional, só para alerta visual (ADR-002, Decisão 1) |
| `atualizado_em` | `TIMESTAMP` | atualizado a cada mudança |

**Índice único:** `(produto_id, data)` — garante um único registro de estoque por produto por dia.

---

## 3. Camada de domínio

### 3.1 Entidade `EstoqueDiario`
**Campos:** `id`, `produtoId`, `data`, `inicial`, `produzido`, `vendido`, `minimo`.

**Método de domínio:**
```text
disponivel(): number → inicial + produzido − vendido
abaixoDoMinimo(): boolean → minimo != null && disponivel() < minimo (usado só para alerta, nunca para bloqueio)
```

**Invariantes:** `inicial`, `produzido`, `vendido` nunca podem ser negativos. `vendido` nunca pode exceder `inicial + produzido` (ou seja, `disponivel()` nunca fica negativo).

### 3.2 Exceções de domínio
- `EstoqueInsuficienteError` (400) — tentativa de debitar mais do que o disponível.
- `ProdutoInativoError` (400) — tentativa de lançar/debitar estoque de produto desativado.

---

## 4. Camada de aplicação

### 4.1 `ObterOuCriarEstoqueDoDia(produtoId, data)`
**Este é o mecanismo do rollover automático (PRD backend §4.4) — e também a correção estrutural do bug do V1 (Seção 6).**

**Fluxo:**
1. Busca o registro de `(produtoId, data)`.
2. Se existir, retorna.
3. Se não existir: busca o registro mais recente **anterior** a `data` para esse produto.
   - Se existir um anterior: cria o registro novo com `inicial = disponível do anterior`, `produzido = 0`, `vendido = 0`.
   - Se não existir nenhum anterior (produto novo, nunca teve estoque lançado): cria com `inicial = 0`, `produzido = 0`, `vendido = 0`.
4. Persiste e retorna o registro criado.

Este caso de uso é chamado **sempre** que qualquer outra parte do sistema precisa ler ou debitar o estoque de um produto num dia — nunca existe a possibilidade de "estoque do dia não encontrado", porque ele é criado automaticamente na primeira consulta.

### 4.2 `UpsertEstoque(produtoId, data, { inicial, produzido, minimo })`
Ajuste manual (tela de Estoque). **Nunca aceita `vendido` como campo editável** — isso só muda através de `DebitarEstoque`/`ReverterDebito`. Valida produto ativo.

### 4.3 `UpsertEstoqueEmLote(lista)`
Mesmo que 4.2, para múltiplos produtos numa única transação — tudo aplicado ou nada (PRD backend §4.4: "upsert em lote").

### 4.4 `DebitarEstoque(conexao, produtoId, data, quantidade)`
**Interface consumida diretamente por SPEC-BE-006 (Perdas) e SPEC-BE-007 (Vendas) — não é exposta como rota HTTP própria, é uma função de aplicação chamada dentro da transação do módulo que a invoca.**

**Fluxo:**
1. Recebe a `conexao`/transação já aberta pelo chamador (para participar do mesmo commit — ex.: uma venda debita estoque **e** grava a venda **e** lança no fluxo de caixa, tudo atômico junto).
2. Executa `SELECT ... FOR UPDATE` na linha de `estoque_diario` (lock a nível de linha — PRD backend §4.4, evita condição de corrida entre caixas simultâneos vendendo o mesmo produto).
3. Chama `ObterOuCriarEstoqueDoDia` se a linha ainda não existir (mesmo lock aplicado).
4. Se `disponivel() < quantidade` → `EstoqueInsuficienteError`.
5. Incrementa `vendido` em `quantidade`, persiste.

### 4.5 `ReverterDebito(conexao, produtoId, data, quantidade)`
Usado em cancelamento de venda (turno aberto) ou correção (SPEC-BE-002/ADR-002 Decisão 2). Decrementa `vendido`. **Sempre usa a data original da operação que gerou o débito**, nunca a data de hoje — conforme já definido no PRD backend §4.6, para não distorcer o estoque histórico.

### 4.6 `ListarEstoqueDoDia(data, filtros)`
Paginado, com filtro por `produto_id`, `categoria_id`, busca por nome de produto. Para cada produto sem registro naquele dia, aplica `ObterOuCriarEstoqueDoDia` antes de listar — a listagem nunca mostra "sem dado", sempre mostra o saldo correto (com rollover já aplicado).

---

## 5. Contratos de API

### 5.1 `GET /api/estoque`
Requer token (qualquer autenticado). Paginado.

**Query:** `?data=2026-08-17&categoria_id=3&produto_id=12&busca=pao&page=1&limit=20`
(`data` padrão: hoje)

**Response 200**
```json
{
  "data": [
    { "produto_id": 12, "nome": "Pão Francês", "data": "2026-08-17", "inicial": 20, "produzido": 50, "vendido": 18, "disponivel": 52, "minimo": 10, "abaixo_do_minimo": false }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1, "hasPrevious": false, "hasNext": false }
}
```

### 5.2 `PUT /api/estoque/:produtoId`
Requer token + permissão `estoque`.

**Request**
```json
{ "data": "2026-08-17", "inicial": 20, "produzido": 50, "minimo": 10 }
```

**Erro**
| Status | Quando |
|---|---|
| 400 | valor negativo em `inicial`/`produzido`/`minimo` |
| 400 | produto inativo |
| 404 | produto não existe |

### 5.3 `POST /api/estoque/lote`
Requer token + permissão `estoque`.

**Request**
```json
{ "data": "2026-08-17", "itens": [ { "produto_id": 12, "inicial": 20, "produzido": 50 }, { "produto_id": 13, "inicial": 5, "produzido": 30 } ] }
```

**Response 200**
```json
{ "atualizados": 2 }
```
Se qualquer item falhar (ex.: produto inexistente), **nenhum é aplicado** — a transação inteira é revertida, e o erro identifica qual item falhou.

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| "Estoque não lançado" ao vender | `ReferenceError` de variável inexistente (`periodo`), gerava erro genérico 500 | Estruturalmente impossível — `ObterOuCriarEstoqueDoDia` sempre cria o registro do dia automaticamente na primeira consulta, nunca existe "ausência" de estoque |
| Campo `mínimo` | Só informativo, mas sem regra explícita documentada | Explicitamente informativo, nunca bloqueia venda (ADR-002, Decisão 1) |
| Débito de estoque | Lógica espalhada, sem lock explícito documentado | Centralizado em `DebitarEstoque`, com `SELECT ... FOR UPDATE`, consumido por Vendas e Perdas do mesmo jeito |
| Perdas afetando estoque | Perda não debitava o saldo mostrado (PRD backend §4.4/4.10) | Perdas (SPEC-BE-006) debitam via este módulo, saldo sempre reflete a realidade |

---

## 7. Critérios de aceite técnicos

1. Consultar o estoque de um produto num dia sem registro prévio cria automaticamente o registro com rollover do saldo do dia anterior, sem erro e sem exigir ação manual.
2. Produto que nunca teve estoque lançado começa com `inicial = 0`, sem erro.
3. `DebitarEstoque` com quantidade maior que o disponível lança `EstoqueInsuficienteError`, nunca deixa o saldo ficar negativo.
4. Duas chamadas concorrentes de `DebitarEstoque` para o mesmo produto/dia, cuja soma excede o disponível: só uma tem sucesso, a outra recebe `EstoqueInsuficienteError` — testável com requisições simultâneas de verdade, não só sequenciais.
5. `minimo` abaixo do saldo nunca impede `DebitarEstoque` — é usado somente para o campo informativo `abaixo_do_minimo` nas consultas.
6. `POST /api/estoque/lote` com um item inválido no meio da lista não aplica nenhum item — tudo ou nada.
7. `ReverterDebito` sempre usa a data original da operação, nunca a data atual, mesmo que chamado dias depois.
