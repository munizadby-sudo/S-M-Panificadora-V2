# SPEC-BE-013 — Funcionários e Folha de Pagamento

- **Status:** Rascunho para revisão
- **Data:** 2026-08-22
- **Módulo:** `src/modules/employees`
- **Depende de:** ADR-001, SPEC-BE-001 (usuário executor)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.12

---

## 0. Nota de origem — este módulo tem menos detalhe herdado que os outros

O PRD backend (Seção 4.12) referencia um `PRD-modulo-funcionarios.md` do legado para o detalhamento completo. **Esse documento não existe no repositório V1** — as rotas correspondentes lá (`funcionarios`, `adiantamentos`, `retiradas`, `folha`) são stubs vazios, sem tabela nem regra real (`res.json({ data: [] })` em tudo). Duas decisões de escopo que não estavam em nenhum documento foram confirmadas diretamente com o dono do produto antes de escrever esta spec:

1. **Adiantamento e retirada são o mesmo conceito** — a V1 tinha as duas rotas com formato idêntico, sem diferença real; unificadas aqui em `adiantamentos`.
2. **Falta, atestado e hora extra são lançamento manual simples** — sem ponto eletrônico, sem cálculo automático de horas trabalhadas. Cada ocorrência é lançada com o valor em reais já decidido pelo operador (ver Seção 3.2) — nunca uma fórmula automática de desconto proporcional ou hora extra a 50%/100%, o que evitaria risco de cálculo trabalhista incorreto num sistema que já é explicitamente "simplificado, não substitui contabilidade formal" (PRD backend §4.12).

**Permissão:** a V1 restringia **todas** as rotas deste módulo a `admin` (`apenasAdmin` em cada uma, sem exceção). A V2 mantém essa mesma decisão — dado salarial é sensível o suficiente para não precisar de uma permissão granular própria na whitelist. Todo endpoint desta spec exige `role = admin`.

---

## 1. Objetivo técnico

Especificar o cadastro de funcionários, o registro de adiantamentos (vale) e ocorrências (falta/atestado/hora extra), e o fechamento simplificado de folha quinzenal — sem cálculo de encargos trabalhistas (INSS/FGTS), conforme já excluído no PRD backend §4.12.

---

## 2. Modelo de dados

### 2.1 Tabela `funcionarios`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `nome` | `VARCHAR(100)` | obrigatório |
| `cargo` | `VARCHAR(60)` | obrigatório |
| `salario_base` | `DECIMAL(10,2)` | obrigatório, > 0 |
| `data_admissao` | `DATE` | obrigatório |
| `ativo` | `TINYINT(1)` | padrão `1`; `0` = desligado (soft delete) |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

### 2.2 Tabela `adiantamentos`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `funcionario_id` | `INT` FK `funcionarios.id` | obrigatório |
| `valor` | `DECIMAL(10,2)` | obrigatório, > 0 |
| `data` | `DATE` | obrigatório |
| `observacao` | `TEXT`, nulo | — |
| `usuario_id` | `INT` FK `usuarios.id` | quem lançou |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

### 2.3 Tabela `ocorrencias_folha`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `funcionario_id` | `INT` FK `funcionarios.id` | obrigatório |
| `tipo` | `ENUM('falta','atestado','hora_extra')` | obrigatório |
| `data` | `DATE` | obrigatório |
| `valor` | `DECIMAL(10,2)` | padrão `0`, ≥ 0 — **sempre informado pelo operador no lançamento**, nunca calculado automaticamente (ver Seção 0) |
| `observacao` | `TEXT`, nulo | — |
| `usuario_id` | `INT` FK `usuarios.id` | quem lançou |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

**Regra por tipo:**
- `falta` → `valor` é um desconto (subtrai da folha).
- `hora_extra` → `valor` é um acréscimo (soma na folha).
- `atestado` → `valor` sempre `0` — atestado médico não gera desconto (ausência justificada); o registro existe só para histórico/controle de frequência, nunca afeta o cálculo da folha.

### 2.4 Tabela `folhas_pagamento`
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `funcionario_id` | `INT` FK `funcionarios.id` | obrigatório |
| `periodo_inicio` | `DATE` | obrigatório |
| `periodo_fim` | `DATE` | obrigatório |
| `salario_base` | `DECIMAL(10,2)` | **snapshot** do `salario_base` do funcionário no momento do fechamento — nunca recalculado se o salário mudar depois |
| `total_adiantamentos` | `DECIMAL(10,2)` | soma dos adiantamentos do funcionário no período |
| `total_faltas` | `DECIMAL(10,2)` | soma das ocorrências `falta` do período |
| `total_horas_extras` | `DECIMAL(10,2)` | soma das ocorrências `hora_extra` do período |
| `valor_liquido` | `DECIMAL(10,2)` | `salario_base + total_horas_extras − total_faltas − total_adiantamentos` |
| `status` | `ENUM('pendente','paga')` | padrão `pendente` |
| `pago_em` | `DATETIME`, nulo | preenchido ao marcar como paga |
| `usuario_id` | `INT` FK `usuarios.id` | quem fechou a folha |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

**Índice único:** `(funcionario_id, periodo_inicio, periodo_fim)` — evita fechar a mesma folha duas vezes para o mesmo funcionário no mesmo período.

---

## 3. Camada de domínio

### 3.1 Entidade `Funcionario`
**Invariantes:** `nome`, `cargo` não vazios; `salarioBase > 0`; `dataAdmissao` obrigatória.
**Métodos:** `desativar()` / `reativar()` — mesmo padrão de soft delete com reativação já usado em Produtos/Clientes (não em Perdas/Encomendas, que são cancelamento final — aqui um funcionário desligado por engano deve poder ser reativado).

### 3.2 Entidade `Adiantamento`
**Invariantes:** `valor > 0`; `funcionarioId` obrigatório.

### 3.3 Entidade `OcorrenciaFolha`
**Invariantes:** `tipo` na whitelist (`falta`, `atestado`, `hora_extra`); se `tipo === 'atestado'`, `valor` é forçado a `0` pela própria entidade, independente do que for enviado — não é uma validação que rejeita, é uma normalização (evita erro de operador que preenche valor num atestado por engano).

### 3.4 Value object `FolhaCalculada` (calculado, não persistido como entidade própria — mesmo padrão da `FechamentoCaixa`, SPEC-BE-002 §3.2)
```text
valor_liquido = salario_base + total_horas_extras − total_faltas − total_adiantamentos
```
Função pura, testável sem banco: recebe os totais já agregados e devolve o cálculo. Nunca calcula encargos trabalhistas (INSS/FGTS) — fora de escopo (PRD backend §4.12).

### 3.5 Exceções de domínio
- `SalarioInvalidoError` (400)
- `ValorAdiantamentoInvalidoError` (400)
- `TipoOcorrenciaInvalidoError` (400)
- `FuncionarioNaoEncontradoError` (404)
- `FolhaJaFechadaError` (409) — tentativa de fechar a mesma folha (funcionário + período) duas vezes
- `FolhaNaoEncontradaError` (404)

---

## 4. Camada de aplicação

### 4.1 Funcionários — `CreateFuncionario`, `UpdateFuncionario`, `DeactivateFuncionario`, `ReactivateFuncionario`, `ListFuncionarios`
Mesmo padrão de CRUD + soft delete/reativação já usado em Clientes (SPEC-BE-009) e Produtos (SPEC-BE-004) — sem repetir aqui campo a campo.

### 4.2 `CreateAdiantamento(funcionarioId, valor, data, observacao, executor)`
Valida funcionário existente e ativo, `valor > 0`, persiste, audita `criar_adiantamento`.

### 4.3 `CreateOcorrenciaFolha(funcionarioId, tipo, data, valor, observacao, executor)`
Valida funcionário existente e ativo, `tipo` na whitelist. Se `tipo === 'atestado'`, força `valor = 0` (Seção 3.3). Persiste, audita `criar_ocorrencia_folha`.

### 4.4 `FecharFolha(funcionarioId, periodoInicio, periodoFim, executor)`
**Fluxo:**
1. Busca o funcionário — se não existir, `FuncionarioNaoEncontradoError`.
2. Verifica se já existe folha para `(funcionarioId, periodoInicio, periodoFim)` → `FolhaJaFechadaError`.
3. Soma `adiantamentos` do funcionário no período.
4. Soma `ocorrencias_folha` do funcionário no período, separando `falta` e `hora_extra` (`atestado` nunca entra na soma, por ter `valor = 0`).
5. Calcula `valor_liquido` via `FolhaCalculada`.
6. Persiste `folhas_pagamento` com `salario_base` snapshot e `status = 'pendente'`.
7. Audita `fechar_folha`.
8. Retorna a folha calculada.

### 4.5 `MarcarFolhaComoPaga(folhaId, executor)`
Marca `status = 'paga'`, `pago_em = agora`. Se a folha não existir, `FolhaNaoEncontradaError`. Se já estiver paga, é idempotente — não lança erro, apenas retorna o estado atual (mesma filosofia de idempotência da SPEC-BE-002 §4.3, para cobrir duplo clique).

### 4.6 `ListAdiantamentos(filtros)` / `ListOcorrenciasFolha(filtros)` / `ListFolhas(filtros)`
Paginados. Filtros: `funcionario_id`, `data_inicio`, `data_fim` (para adiantamentos/ocorrências); `funcionario_id`, `status`, `periodo_inicio`, `periodo_fim` (para folhas).

---

## 5. Contratos de API

Todos exigem token + `role = admin` (Seção 0).

### 5.1 Funcionários
- `POST /api/funcionarios`, `PUT /api/funcionarios/:id`, `DELETE /api/funcionarios/:id` (desativar), `POST /api/funcionarios/:id/reativar`, `GET /api/funcionarios`.

### 5.2 `POST /api/adiantamentos`
```json
{ "funcionario_id": 3, "valor": 150.00, "data": "2026-08-20", "observacao": "Vale adiantado" }
```
### 5.3 `GET /api/adiantamentos`
Query: `?funcionario_id=3&data_inicio=2026-08-01&data_fim=2026-08-31&page=1&limit=20`

### 5.4 `POST /api/ocorrencias-folha`
```json
{ "funcionario_id": 3, "tipo": "hora_extra", "data": "2026-08-18", "valor": 45.00, "observacao": "Reforço na produção de fim de semana" }
```
**Erro**
| Status | Quando |
|---|---|
| 400 | `tipo` fora da whitelist |
| 404 | funcionário não existe |

### 5.5 `GET /api/ocorrencias-folha`
Query: `?funcionario_id=3&data_inicio=2026-08-01&data_fim=2026-08-31&page=1&limit=20`

### 5.6 `POST /api/folhas`
```json
{ "funcionario_id": 3, "periodo_inicio": "2026-08-01", "periodo_fim": "2026-08-15" }
```
**Response 200**
```json
{
  "id": 9, "funcionario_id": 3, "periodo_inicio": "2026-08-01", "periodo_fim": "2026-08-15",
  "salario_base": 1800.00, "total_adiantamentos": 150.00, "total_faltas": 0, "total_horas_extras": 45.00,
  "valor_liquido": 1695.00, "status": "pendente"
}
```
**Erro**
| Status | Quando |
|---|---|
| 409 | já existe folha fechada para esse funcionário nesse período |

### 5.7 `POST /api/folhas/:id/pagar`
Marca como paga. Idempotente (Seção 4.5).

### 5.8 `GET /api/folhas`
Query: `?funcionario_id=3&status=pendente&page=1&limit=20`

---

## 6. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Funcionários/Folha/Adiantamentos/Retiradas | Stubs de rota sem tabela nem regra real | Modelo de dados completo, cálculo simplificado de folha |
| Adiantamento vs. retirada | Duas rotas idênticas, sem diferença clara | Unificados em um único conceito (`adiantamentos`) |
| Falta/atestado/hora extra | Inexistente | Lançamento manual, valor em reais decidido pelo operador — atestado nunca desconta |

---

## 7. Critérios de aceite técnicos

1. Fechar a mesma folha (funcionário + período) duas vezes retorna 409 na segunda tentativa — nenhum dado é duplicado.
2. `atestado` sempre persiste com `valor = 0`, mesmo que o operador envie um valor diferente de zero.
3. `valor_liquido` da folha é sempre `salario_base + total_horas_extras − total_faltas − total_adiantamentos`, testável por unidade sem banco.
4. Marcar uma folha já paga como paga novamente não lança erro — é idempotente.
5. `salario_base` da folha fechada nunca muda, mesmo que o salário do funcionário seja alterado depois.
6. Todo endpoint deste módulo retorna 403 para qualquer usuário que não seja `admin`, mesmo com outras permissões concedidas.
