# SPEC-BE-007 — PDV / Vendas

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `src/modules/sales`
- **Depende de:** ADR-001, ADR-002 (Decisões 1 e 2), SPEC-BE-001 (executor/RBAC), SPEC-BE-002 (Caixa por Turno — turno aberto, `CorrecaoPendente`, `fluxo_caixa`), SPEC-BE-004 (produto), SPEC-BE-005 (`DebitarEstoque`/`ReverterDebito`)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.6

---

## 1. Objetivo técnico

Especificar a transação mais crítica do sistema: confirmar uma venda debita estoque de cada item, gera numeração sequencial atômica, lança automaticamente no fluxo de caixa do turno — tudo dentro de uma única transação, tudo ou nada. E especificar o cancelamento, que se comporta de dois jeitos diferentes dependendo se o turno da venda ainda está aberto (ADR-002, Decisão 2).

---

## 2. Modelo de dados

### 2.1 Tabela `sequencias`
| Coluna | Tipo | Regras |
|---|---|---|
| `chave` | `VARCHAR(30)` PK | ex.: `venda` |
| `valor` | `INT` | último número emitido |

Geração atômica via `INSERT ... ON DUPLICATE KEY UPDATE valor = LAST_INSERT_ID(valor + 1)` — padrão MySQL para sequência sem condição de corrida, sem precisar de lock explícito de linha.

### 2.2 Tabela `vendas`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `numero` | `INT` | sequencial, único, gerado via `sequencias` |
| `turno_id` | `INT` FK `caixa_turnos.id` | obrigatório — venda sempre pertence a um turno |
| `usuario_id` | `INT` FK `usuarios.id` | obrigatório |
| `forma_pagamento` | `ENUM('dinheiro','pix','cartao','credito')` | obrigatório |
| `total` | `DECIMAL(10,2)` | obrigatório, > 0, **sempre recalculado no backend a partir dos itens**, nunca aceito do cliente |
| `status` | `ENUM('confirmada','cancelada')` | padrão `confirmada` |
| `motivo_cancelamento` | `TEXT`, nulo | preenchido no cancelamento |
| `cancelado_por` | `INT` FK `usuarios.id`, nulo | — |
| `cancelado_em` | `DATETIME`, nulo | — |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

### 2.3 Tabela `venda_itens`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `venda_id` | `INT` FK `vendas.id` | obrigatório |
| `produto_id` | `INT` FK `produtos.id` | obrigatório |
| `quantidade` | `DECIMAL(10,3)` | obrigatório, > 0 |
| `preco_unitario` | `DECIMAL(10,2)` | **snapshot** do `produto.preco` no momento da venda — nunca recalculado se o preço do produto mudar depois |
| `subtotal` | `DECIMAL(10,2)` | `quantidade × preco_unitario` |

### 2.4 Tabela `correcoes_pendentes` *(nova, prevista na ADR-002, Decisão 2)*
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `venda_id` | `INT` FK `vendas.id` | obrigatório |
| `motivo` | `TEXT` | obrigatório |
| `solicitado_por` | `INT` FK `usuarios.id` | obrigatório |
| `status` | `ENUM('pendente','resolvida')` | padrão `pendente` |
| `resolvido_por` | `INT` FK `usuarios.id`, nulo | — |
| `resolvido_em` | `DATETIME`, nulo | — |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

---

## 3. Camada de domínio

### 3.1 Entidade `Venda`
**Invariantes:**
- Pelo menos um item.
- `total` é sempre a soma dos `subtotal` dos itens — a entidade recalcula, nunca aceita um `total` externo como verdade.
- Toda venda pertence a um `turno_id` — não existe venda "solta".

**Método `dataOperacao()`** — retorna a data (sem hora) em que a venda efetivamente ocorreu, usada por `CancelSale`/`ResolverCorrecaoPendente` para reverter o estoque no dia correto (Seções 4.2 e 4.3).

> **Correção de implementação (2026-08-17):** a primeira versão calculava essa data cortando a string ISO em UTC (`timestamp.slice(0, 10)`). Isso é um bug sutil: o servidor grava `criado_em` em UTC, mas a operação (Recife, UTC-3) já pode estar em outro dia civil — uma venda feita às 20h30 (horário local) cai depois das 23h30 em UTC, e ainda mais perto da virada gera timestamp UTC do **dia seguinte**. Cortar a string em UTC faria `dataOperacao()` devolver a data errada, e a reversão de estoque no cancelamento aconteceria no dia seguinte ao real — um erro silencioso, que só apareceria num balanço não batendo, sem ninguém saber por quê. `dataOperacao()` agora converte para o fuso `America/Recife` antes de extrair a data.

### 3.2 Exceções de domínio
- `CaixaFechadoError` (403, código `CAIXA_FECHADO`) — sem turno aberto.
- `CarrinhoVazioError` (400)
- `EstoqueInsuficienteError` (400, reaproveitada da SPEC-BE-005) — identifica qual item específico não tinha saldo.
- `VendaNaoEncontradaError` (404)
- `CancelamentoDeTurnoFechadoError` — **não é lançada ao usuário como erro**; internamente, o caso de uso desvia automaticamente para o fluxo de correção pendente (ver 4.2).

---

## 4. Camada de aplicação

### 4.1 `CreateSale(itens[], formaPagamento, executor)`
**Fluxo (transação única):**
1. `turno = CaixaTurnoRepository.buscarTurnoAberto()` — **único ponto do sistema que checa isso** (corrige a duplicação do V1 entre middleware órfão e service, PRD backend §4.6).
2. Se `!turno` → `CaixaFechadoError`.
3. Se `itens.length === 0` → `CarrinhoVazioError`.
4. Abre transação.
5. Gera `numero` via `sequencias` (atômico).
6. Para cada item: busca `produto.preco` e `produto.custo` atuais (snapshot), calcula `subtotal`.
7. Para cada item, **na mesma transação**: `DebitarEstoque(conexao, produtoId, hoje, quantidade)` (SPEC-BE-005, Seção 4.4). Se qualquer item falhar por `EstoqueInsuficienteError`, a transação inteira é revertida — nenhuma venda parcial, nenhum item debitado sozinho.
8. Calcula `total = Σ subtotal`.
9. Persiste `venda` + `venda_itens`.
10. Lança automaticamente em `fluxo_caixa` (SPEC-BE-002, Seção 2.2): `categoria='vendas'`, `gerado_auto=true`, `turno_id=turno.id`, `forma=formaPagamento`, `valor=total`, `data=hoje`.
11. Commit.
12. Audita `criar_venda`.
13. Retorna a venda criada com `numero`.

**Nota (ADR-002, Decisão 1):** este fluxo **nunca consulta o campo `minimo`** do estoque — só o `disponivel()` real. Vender abaixo do mínimo configurado é permitido, o mínimo é só alerta visual (SPEC-BE-005/SPEC-FE-005).

### 4.2 `CancelSale(vendaId, motivo, executor)`
Restrito a `admin`.

**Fluxo:**
1. Busca a venda — se não existir, `VendaNaoEncontradaError`.
2. Busca o turno dessa venda (`venda.turno_id`).
3. **Se o turno ainda está `aberto`:**
   - Transação única: `ReverterDebito` (estoque, data original da venda), lança estorno em `fluxo_caixa` (`categoria='estorno'`, mesmo `turno_id`, `valor=total`), marca `venda.status='cancelada'`, `motivo_cancelamento`, `cancelado_por`, `cancelado_em`.
   - Audita `cancelar_venda`.
   - Retorna confirmação de cancelamento direto.
4. **Se o turno já está `fechado`** (ADR-002, Decisão 2): **não cancela diretamente.** Em vez disso:
   - Cria um registro em `correcoes_pendentes` (`venda_id`, `motivo`, `solicitado_por=executor`, `status='pendente'`).
   - A venda **permanece com `status='confirmada'`** até a correção ser resolvida.
   - Audita `solicitar_correcao_venda`.
   - Retorna confirmação de que a correção foi registrada como pendente (não que a venda foi cancelada).

### 4.3 `ResolverCorrecaoPendente(correcaoId, executor)`
Restrito a `admin`. Chamado quando há um turno aberto (normalmente o primeiro turno do dia seguinte, avisado na abertura via SPEC-BE-002, Seção 4.1).

**Fluxo (transação única):**
1. Busca a correção pendente — se não existir ou já `resolvida`, erro 404.
2. Busca a venda original e seu `turno_id` antigo (só para referência, **nunca é modificado**).
3. Busca o `turnoAtual = CaixaTurnoRepository.buscarTurnoAberto()` — se não houver turno aberto agora, erro (a resolução exige um turno aberto para lançar o ajuste).
4. `ReverterDebito(conexao, produtoId, data_original_da_venda, quantidade)` para cada item — o estoque é revertido no dia em que a venda realmente aconteceu, não hoje (mesma regra do PRD backend §4.6).
5. Lança o ajuste em `fluxo_caixa`: `categoria='correcao_venda_anterior'`, `turno_id=turnoAtual.id` (**o turno de agora, nunca o antigo**), `valor=venda.total`, referenciando `venda_id` para rastreabilidade.
6. Marca `venda.status='cancelada'`.
7. Marca a correção como `resolvida`, `resolvido_por`, `resolvido_em`.
8. Commit.
9. Audita `resolver_correcao_venda`.

### 4.4 `ListSales(filtros)`
**Sempre paginado** — correção explícita em relação ao V1 (PRD backend §4.6: *"a listagem de vendas não é paginada e pode retornar um intervalo de datas arbitrariamente grande"*). Filtros: `turno_id`, `data_inicio`, `data_fim`, `status`.

---

## 5. Contratos de API

### 5.1 `POST /api/vendas`
Requer token + permissão `caixa`.

**Request**
```json
{
  "forma_pagamento": "dinheiro",
  "itens": [ { "produto_id": 12, "quantidade": 3 }, { "produto_id": 15, "quantidade": 1 } ]
}
```

**Response 200**
```json
{ "id": 481, "numero": 1024, "total": 12.75, "forma_pagamento": "dinheiro", "status": "confirmada" }
```

**Erros**
| Status | Código | Quando |
|---|---|---|
| 403 | `CAIXA_FECHADO` | sem turno aberto |
| 400 | — | carrinho vazio |
| 400 | — | estoque insuficiente (identifica o `produto_id`) |

### 5.2 `GET /api/vendas`
Requer token + permissão `caixa`. Paginado, obrigatoriamente.

**Query:** `?turno_id=12&data_inicio=2026-08-01&data_fim=2026-08-17&status=confirmada&page=1&limit=20`

### 5.3 `DELETE /api/vendas/:id`
Requer token + `admin`.

**Request**
```json
{ "motivo": "Item lançado em dobro" }
```

**Response 200 (turno aberto — cancelamento direto)**
```json
{ "status": "cancelada", "tipo": "cancelamento_direto" }
```

**Response 200 (turno fechado — correção pendente criada)**
```json
{ "status": "correcao_pendente", "tipo": "correcao_pendente", "correcao_id": 3 }
```

### 5.4 `POST /api/vendas/correcoes/:id/resolver`
Requer token + `admin`.

**Erro**
| Status | Quando |
|---|---|
| 400 | não há turno aberto no momento (a resolução precisa de um turno para lançar o ajuste) |
| 404 | correção não existe ou já foi resolvida |

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Cálculo da data da venda para reversão de estoque | Não documentado no V1 | `dataOperacao()` usa fuso `America/Recife`, não corte de string ISO em UTC — evita reverter estoque no dia errado perto da virada da meia-noite |
| Checagem de caixa aberto | Duplicada (middleware órfão + service) | Único ponto, dentro de `CreateSale` |
| Cancelamento de venda de turno fechado | Permitido; estorno vai para o fluxo do dia da ação, distorcendo a conciliação do turno vigente | Vira `CorrecaoPendente`; ajuste lançado no turno atual quando resolvido (ADR-002, Decisão 2) |
| Listagem de vendas | Sem paginação | Sempre paginada |
| Bloqueio por estoque mínimo | Não documentado | Explicitamente nunca bloqueia venda (ADR-002, Decisão 1) — só `disponivel()` real importa |
| Preço/custo no momento da venda | Não confirmado se era snapshot | Sempre snapshot (`preco_unitario` gravado no item, nunca recalculado) |

---

## 7. Critérios de aceite técnicos

1. Venda sem turno aberto retorna 403 `CAIXA_FECHADO`, e nenhuma linha é escrita em nenhuma tabela.
2. Venda com um item sem estoque suficiente não persiste nada — nem a venda, nem os itens, nem o débito dos outros itens que tinham saldo.
3. Número sequencial nunca duplica sob concorrência (teste com requisições simultâneas de verdade).
4. Cancelar venda de turno **aberto** reverte estoque e lança estorno no `fluxo_caixa` do mesmo turno, imediatamente.
5. Cancelar venda de turno **fechado** nunca altera a venda nem o turno antigo — cria `CorrecaoPendente` e retorna isso claramente na resposta (`tipo: correcao_pendente`), não um cancelamento.
6. Resolver uma correção pendente lança o ajuste sempre no turno atualmente aberto, nunca no turno antigo da venda original.
7. `GET /api/vendas` sem parâmetros de paginação ainda assim aplica um limite padrão — nunca retorna a tabela inteira de uma vez.
8. Venda nunca aceita `minimo` de estoque como bloqueio — só a disponibilidade real.
