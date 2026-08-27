# SPEC-BE-011 — Encomendas

- **Status:** Rascunho para revisão
- **Data:** 2026-08-22
- **Módulo:** `src/modules/orders`
- **Depende de:** ADR-001, ADR-002 (Decisão 3 — encomenda não debita estoque), SPEC-BE-001 (executor/RBAC — permissão `encomendas`), SPEC-BE-004 (produto), SPEC-BE-007 (reaproveita a tabela `sequencias` e o padrão de numeração atômica, chave `encomenda`), SPEC-BE-009 (Clientes — vínculo opcional)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.9; `PRD-008-encomendas.md` (frontend)

---

## 1. Objetivo técnico

Especificar o registro de pedidos de clientes: numeração própria (independente de Vendas), itens com total sempre recalculado no backend, vínculo opcional com o cadastro de Cliente, e cancelamento sempre como soft delete.

**Decisão já fechada, não reaberta aqui:** encomenda **nunca** debita nem reserva estoque, nem na criação nem na entrega (ADR-002, Decisão 3). Este módulo não tem nenhuma dependência de `EstoqueRepository`, `DebitarEstoque` ou `IncrementarProduzido` — diferente de Vendas e Perdas.

---

## 2. Modelo de dados

### 2.1 Tabela `encomendas`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `numero` | `INT` | sequencial, único, gerado via `sequencias` (chave `encomenda` — mesmo mecanismo da SPEC-BE-007, contador independente do de vendas) |
| `cliente_id` | `INT` FK `clientes.id`, nulo | vínculo **opcional** — encomenda não exige cliente cadastrado |
| `cliente_nome` | `VARCHAR(100)` | obrigatório — sempre preenchido, cadastrado ou não |
| `cliente_telefone` | `VARCHAR(20)` | obrigatório |
| `data_entrega` | `DATE` | obrigatório |
| `sinal` | `DECIMAL(10,2)` | padrão `0`, ≥ 0 |
| `observacoes` | `TEXT`, nulo | — |
| `total` | `DECIMAL(10,2)` | **sempre recalculado no backend a partir dos itens**, nunca aceito do cliente |
| `status` | `ENUM('pendente','pronto','entregue')` | padrão `pendente` |
| `ativo` | `TINYINT(1)` | padrão `1`; `0` = cancelada (soft delete) |
| `usuario_id` | `INT` FK `usuarios.id` | quem criou o pedido |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

**Por que `cliente_nome`/`cliente_telefone` existem soltos, além do vínculo opcional:** o contato do pedido é sempre necessário mesmo quando o cliente não tem (ou não quer) cadastro formal. Quando `cliente_id` é informado, esses dois campos são preenchidos a partir do cadastro no momento da criação, mas continuam sendo a fonte de verdade *desta encomenda* — se o cliente mudar de telefone depois, o pedido antigo não muda retroativamente.

### 2.2 Tabela `encomenda_itens`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `encomenda_id` | `INT` FK `encomendas.id` | obrigatório |
| `produto_id` | `INT` FK `produtos.id` | obrigatório |
| `quantidade` | `DECIMAL(10,3)` | obrigatório, > 0 |
| `preco_unitario` | `DECIMAL(10,2)` | **snapshot** do `produto.preco` no momento do cadastro/edição — nunca recalculado se o preço do produto mudar depois |
| `subtotal` | `DECIMAL(10,2)` | `quantidade × preco_unitario` |

---

## 3. Camada de domínio

### 3.1 Entidade `Encomenda`
**Invariantes:**
- Pelo menos um item.
- `total` é sempre a soma dos `subtotal` dos itens — a entidade recalcula, nunca aceita um `total` externo como verdade (mesmo padrão da entidade `Venda`, SPEC-BE-007).
- `status` só pode ser `pendente`, `pronto` ou `entregue`. Transições: operador só `pendente → pronto`; `entregue` só via `finalizarEntrega()` (a partir de `pronto`); admin pode `pronto → pendente` e `entregue → pronto` (reabrir). `PATCH` nunca aceita `entregue`.
- `sinal` nunca pode ser negativo.
- `cliente_nome` e `cliente_telefone` são sempre obrigatórios, independente de `cliente_id` estar preenchido.
- `saldoAReceber()` = `max(0, total − sinal)`.

**Método `cancelar()`** — marca `ativo = false`. **Não cancela se `status === 'entregue'`** (`EncomendaEntregueBloqueadaError`). Assim como o estorno de Perdas (SPEC-BE-006), **não existe reativação simétrica** de cancelamento. Reabrir entrega (admin) é outro fluxo, só de `entregue → pronto`.

### 3.2 Exceções de domínio
- `StatusEncomendaInvalidoError` (400)
- `ItensObrigatoriosError` (400) — encomenda sem nenhum item
- `EncomendaNaoEncontradaError` (404)
- `SinalInvalidoError` (400)
- `TransicaoStatusInvalidaError` (400)
- `EncomendaEntregueBloqueadaError` (403)
- `EncomendaNaoEstaProntaError` (400)
- Reaproveitadas de outros módulos: `ProdutoNaoEncontradoError`/`ProdutoInativoError` (produto do item), `ClienteNaoEncontradoError` (quando `cliente_id` é informado mas não existe), `CaixaFechadoError` (403) e `FormaPagamentoInvalidaError` (400) no finalizar

---

## 4. Camada de aplicação

### 4.1 `CreateEncomenda({ clienteId?, clienteNome, clienteTelefone, dataEntrega, sinal, observacoes, itens[] }, executor)`
**Fluxo (transação única):**
1. Se `clienteId` informado: busca o cliente — se não existir, `ClienteNaoEncontradoError`. (Não exige que esteja `ativo` — um cliente desativado depois de já ter feito pedidos não invalida o histórico.)
2. Se `itens.length === 0` → `ItensObrigatoriosError`.
3. Para cada item: busca o produto — se não existir, `ProdutoNaoEncontradoError`; se inativo, `ProdutoInativoError`. Snapshot de `produto.preco`, calcula `subtotal`.
4. `total = Σ subtotal`.
5. Abre transação. Gera `numero` via `sequencias` (chave `encomenda`, mesmo mecanismo atômico da SPEC-BE-007 Seção 2.1 — nunca colide com a numeração de vendas, contadores independentes).
6. Persiste `encomenda` + `encomenda_itens`. **Nenhuma chamada a `DebitarEstoque`/`IncrementarProduzido`** (ADR-002, Decisão 3).
7. Commit.
8. Audita `criar_encomenda`.

### 4.2 `UpdateEncomenda(id, { clienteId?, clienteNome, clienteTelefone, dataEntrega, sinal, observacoes, itens[] }, executor)`
**Substitui todos os itens — nunca faz merge incremental** (regra herdada do V1, mantida explicitamente no PRD).

**Fluxo (transação única):**
1. Busca a encomenda — se não existir ou `ativo = 0`, `EncomendaNaoEncontradaError`. Se `status === 'entregue'`, `EncomendaEntregueBloqueadaError`.
2. Mesma validação de cliente/itens do `CreateEncomenda`.
3. Remove todos os `encomenda_itens` existentes e insere os novos (delete + insert, não upsert por item).
4. Recalcula `total`.
5. Commit.
6. Audita `atualizar_encomenda`, com `estadoAntes`/`estadoDepois`.

### 4.3 `UpdateStatusEncomenda(id, status, executor)`
Valida whitelist e **transição** (`mudarStatus` com `executor.role`). Operador: só `pendente → pronto`. `PATCH` para `entregue` sempre `TransicaoStatusInvalidaError` — entrega é o caso `FinalizarEncomenda`. Admin: `pronto → pendente` e `entregue → pronto` (reabrir); ao reabrir, se existir lançamento ativo com `encomenda_id`, marca excluído (`ativo=0`).

### 4.4 `FinalizarEncomenda(id, { forma }, executor)`
Marca `pronto → entregue` e, se `saldoAReceber() > 0`, lança `fluxo_caixa` automático. **Não cria venda** e **não debita estoque**.

**Fluxo (transação única):**
1. Busca a encomenda ativa — 404 se não existir.
2. Exige turno aberto (`CaixaFechadoError` 403).
3. Se saldo > 0, `forma` obrigatória (`dinheiro|pix|cartao|credito`).
4. `finalizarEntrega()` (só de `pronto`).
5. Se saldo > 0: `fluxoCaixaRepository.registrar` com `categoria: 'encomenda'`, `gerado_auto: true`, `encomenda_id`, `valor = saldo`, `forma`. Se saldo = 0, não lança (valor do fluxo exige > 0).
6. Audita `finalizar_encomenda`.

### 4.5 `CancelEncomenda(id, executor)`
Soft delete (`ativo = 0`). Recusa encomenda `entregue` (`EncomendaEntregueBloqueadaError`). Sem restrição de `admin` nos demais status. Audita `cancelar_encomenda`. Nunca remove fisicamente.

### 4.6 `ListEncomendas(filtros)`
Paginado. Filtros: `status`, `ativo` (padrão: só ativas), `cliente_id`, `data_entrega_inicio`, `data_entrega_fim`.

---

## 5. Contratos de API

### 5.1 `POST /api/encomendas`
Requer token + permissão `encomendas`.

**Request**
```json
{
  "cliente_id": 7,
  "cliente_nome": "Maria Souza",
  "cliente_telefone": "83999998888",
  "data_entrega": "2026-08-25",
  "sinal": 20,
  "observacoes": "Sem glúten",
  "itens": [ { "produto_id": 12, "quantidade": 10 } ]
}
```

**Response 200**
```json
{ "id": 3, "numero": 45, "total": 15.00, "status": "pendente" }
```

**Erros**
| Status | Quando |
|---|---|
| 400 | itens vazio |
| 400 | `sinal` negativo |
| 404 | `cliente_id` informado mas não existe |
| 404 | algum `produto_id` não existe |
| 400 | algum produto do item está inativo |

### 5.2 `PUT /api/encomendas/:id`
Mesma validação do `POST`. Substitui todos os itens. Recusa `status === 'entregue'` (403).

### 5.3 `PATCH /api/encomendas/:id/status`
Requer token + permissão `encomendas`. Não marca como entregue — isso é o `POST .../finalizar`.

**Request**
```json
{ "status": "pronto" }
```

**Erro**
| Status | Quando |
|---|---|
| 400 | `status` fora da whitelist ou transição inválida (ex.: PATCH para `entregue`) |
| 403 | operador tenta reabrir `entregue` |
| 404 | encomenda não existe ou está cancelada |

### 5.4 `POST /api/encomendas/:id/finalizar`
Requer token + permissão `encomendas`. Caixa aberto obrigatório.

**Request**
```json
{ "forma": "dinheiro" }
```
`forma` obrigatória só se `saldo_a_receber > 0`. Formas: `dinheiro`, `pix`, `cartao`, `credito`.

**Erro**
| Status | Quando |
|---|---|
| 403 | caixa fechado |
| 400 | encomenda não está `pronto`, ou forma inválida/ausente com saldo > 0 |
| 404 | encomenda não existe ou está cancelada |

### 5.5 `DELETE /api/encomendas/:id` (cancelamento — soft delete)
Requer token + permissão `encomendas`.

**Response 200**
```json
{ "mensagem": "Encomenda cancelada." }
```

### 5.6 `GET /api/encomendas/:id`
Requer token + permissão `encomendas`. Retorna o detalhe completo, **incluindo os itens** (a listagem paginada, Seção 5.7, não inclui) — consumido pela tela de edição do frontend.

**Erro**
| Status | Quando |
|---|---|
| 404 | encomenda não existe ou está cancelada |

### 5.7 `GET /api/encomendas`
Requer token + permissão `encomendas`. Paginado.

**Query:** `?status=pendente&cliente_id=7&data_entrega_inicio=2026-08-01&data_entrega_fim=2026-08-31&ativo=1&page=1&limit=20`

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Exclusão de encomenda | Física, definitiva | Soft delete (`ativo=0`), rotulada como "cancelar" — histórico preservado |
| Vínculo com cliente | Dados soltos digitados em cada pedido | `cliente_nome`/`cliente_telefone` continuam obrigatórios, mas agora com vínculo opcional a um cadastro central (SPEC-BE-009) |
| Efeito no estoque | Não debitava | Continua não debitando — decisão explícita registrada em ADR (ADR-002, Decisão 3), não mais implícita |
| Entrega / dinheiro | Status livre na whitelist; sem lançamento no caixa | Ciclo Pendente → Pronto → Finalizar (fluxo `categoria: 'encomenda'`); Entregue travado; admin reabre |

---

## 7. Critérios de aceite técnicos

1. Criar encomenda sem nenhum item retorna 400, nenhum registro é criado.
2. `total` da encomenda é sempre a soma dos subtotais dos itens enviados, nunca um valor recebido diretamente do cliente.
3. `cliente_id` inexistente retorna 404 antes de qualquer escrita.
4. Editar encomenda substitui todos os itens — um item antigo não enviado na edição desaparece, nunca fica "acumulado".
5. Criar ou editar encomenda nunca chama `DebitarEstoque` nem `IncrementarProduzido` — o saldo de estoque do produto não muda em nenhum momento do fluxo.
6. Cancelar encomenda nunca remove a linha do banco — continua consultável com `ativo=0`.
7. Numeração de encomenda nunca colide com numeração de venda, mesmo estando na mesma tabela `sequencias` (chaves distintas).
8. `PATCH .../status` só aceita `pendente → pronto` (e, para admin, `pronto → pendente` e `entregue → pronto`). PATCH para `entregue` retorna 400.
9. `POST .../finalizar` com caixa aberto marca `entregue` e lança `fluxo_caixa` `categoria: 'encomenda'` quando há saldo; caixa fechado retorna 403. Não cria venda nem mexe em estoque.
10. Sinal na criação, dois lançamentos por pedido e estorno de todos ao reabrir/cancelar: SPEC-BE-015 / PRD-018 (não reabrir o desenho antigo “só o saldo entra no caixa”).
