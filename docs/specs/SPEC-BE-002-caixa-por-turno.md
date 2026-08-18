# SPEC-BE-002 — Caixa por Turno

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** `src/modules/cash-register`
- **Depende de:** ADR-001, SPEC-BE-001 (usuário executor), PRD-backend (Seção 4.7), PRD-004 (frontend)
- **Referência de comportamento:** `S-M-Panificadora` (V1) — `backend/routes/caixaTurno.js`, `backend/services/caixaTurnoService.js` ("Opção B" — já corrige o bug de período dinâmico citado no PRD-backend, ver Seção 8 deste documento), tabelas `caixa_turnos` e `fluxo_caixa`

---

## 1. Objetivo técnico

Especificar o modelo de dados, os contratos de API e a estrutura de classes do módulo de Caixa por Turno — o módulo mais crítico do sistema, responsável por bloquear vendas sem turno aberto e apurar a diferença de caixa no fechamento.

**Decisão confirmada:** existe **um único modelo de caixa**, por turno. Não há tabela ou rota equivalente a `caixa_movimentos` do V1 (sistema legado/vestigial) na V2.

---

## 2. Modelo de dados

### 2.1 Tabela `caixa_turnos`

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `data` | `DATE` | obrigatório |
| `periodo` | `ENUM('manha','tarde')` | obrigatório; **fixado no momento da abertura**, nunca recalculado depois |
| `status` | `ENUM('aberto','fechado')` | padrão `aberto` |
| `aberto_por` | `INT` FK `usuarios.id` | obrigatório |
| `aberto_em` | `DATETIME` | padrão `CURRENT_TIMESTAMP` |
| `fundo_especie` | `DECIMAL(10,2)` | padrão `0.00` |
| `fundo_moedas` | `DECIMAL(10,2)` | padrão `0.00` |
| `fechado_por` | `INT` FK `usuarios.id` | nulo até o fechamento |
| `fechado_em` | `DATETIME` | nulo até o fechamento |
| `esperado_dinheiro` / `esperado_pix` / `esperado_cartao` | `DECIMAL(10,2)` | preenchidos no fechamento |
| `contado_dinheiro` / `contado_pix` / `contado_cartao` / `contado_moedas` | `DECIMAL(10,2)` | preenchidos no fechamento |
| `diferenca_dinheiro` / `diferenca_pix` / `diferenca_cartao` / `diferenca_total` | `DECIMAL(10,2)` | preenchidos no fechamento |
| `observacao` | `TEXT` | opcional |

**Índice único recomendado:** `(data, periodo)` — garante a nível de banco que não existam dois turnos para o mesmo período no mesmo dia (hoje o V1 garante isso por checagem de aplicação antes do insert; a V2 deve reforçar com constraint de banco para eliminar condição de corrida).

### 2.2 Tabela `fluxo_caixa` (compartilhada com o módulo de Fluxo de Caixa, ver SPEC futura)

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK | — |
| `usuario_id` | `INT` FK | — |
| `turno_id` | `INT` FK `caixa_turnos.id` | **obrigatório na V2** (no V1 é `NULL`-ável para compatibilidade com lançamentos legados sem turno — a V2 não carrega esse legado) |
| `tipo` | `ENUM('entrada','saida')` | obrigatório |
| `descricao` | `VARCHAR(200)` | obrigatório |
| `categoria` | `VARCHAR(50)` | ex.: `vendas`, `estorno`, `sangria`, `suprimento` |
| `forma` | `VARCHAR(30)` | `dinheiro`, `pix`, `cartao` |
| `valor` | `DECIMAL(10,2)` | obrigatório, > 0 |
| `data` | `DATE` | obrigatório |
| `gerado_auto` | `TINYINT(1)` | `1` = criado pelo sistema (venda/estorno); `0` = manual |
| `venda_id` | `INT` FK `vendas.id`, nulo | **adicionado durante a implementação da SPEC-BE-007** (não previsto aqui originalmente) — rastreia qual venda gerou o lançamento automático, quando aplicável. Nulo para lançamentos manuais e para os que não se originam de uma venda. |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

---

## 3. Camada de domínio (`src/modules/cash-register/domain`)

### 3.1 Entidade `CaixaTurno`

**Campos:** `id`, `data`, `periodo`, `status`, `abertoPor`, `abertoEm`, `fundoEspecie`, `fundoMoedas`, campos de fechamento (opcionais até o fechamento).

**Invariantes:**
- `periodo` é definido apenas na criação (abertura) e nunca alterado depois — imutável após a construção.
- `fundoEspecie` e `fundoMoedas` não podem ser negativos.
- Um turno só pode transicionar de `aberto` para `fechado`, nunca o inverso.

**Métodos de domínio:**
- `estaAberto(): boolean`
- `calcularFundoTotal(): number` → `fundoEspecie + fundoMoedas`

### 3.2 Entidade `FechamentoCaixa` (value object, calculado — não persistido como entidade própria, mas como resultado de cálculo)

**Regra central (mantida do V1, já validada em produção):**
```text
esperado_dinheiro = fundo_especie + fundo_moedas + Σ(entradas dinheiro do turno) − Σ(saídas dinheiro do turno)
esperado_pix      = Σ(entradas pix do turno)     − Σ(saídas pix do turno)
esperado_cartao   = Σ(entradas cartão do turno)  − Σ(saídas cartão do turno)

contado_dinheiro  = contado_dinheiro_informado + contado_moedas_informado
diferenca_forma   = contado_forma − esperado_forma
diferenca_total   = Σ diferenca_forma

status_resumo = diferenca_total == 0 ? 'bateu certo' : (diferenca_total > 0 ? 'sobra' : 'falta')
```
- Considera apenas lançamentos de `fluxo_caixa` com `categoria IN ('vendas', 'estorno')` — sangrias/suprimentos manuais não entram no "esperado" de venda, mas entram na conciliação geral do fluxo (módulo separado).
- Todo o cálculo acima deve viver na camada de domínio, como função pura, testável sem banco (recebe os totais já agregados e devolve o resultado).

### 3.3 Exceções de domínio
- `TurnoJaAbertoError` (409) — já existe turno aberto no dia (qualquer período).
- `PeriodoJaRegistradoError` (409) — já existe turno (aberto ou fechado) para aquele período naquele dia.
- `NenhumTurnoAbertoError` (400) — tentativa de fechar sem turno aberto, ou tentativa de venda sem turno aberto (`CAIXA_FECHADO`).
- `TurnoNaoEncontradoError` (404) — `turno_id` informado no fechamento não corresponde a nenhum turno existente.

---

## 4. Camada de aplicação (`src/modules/cash-register/application`)

### 4.1 Caso de uso `AbrirCaixa`
**Entrada:** `{ fundo_especie, fundo_moedas }`, executor.
**Fluxo:**
1. Calcular `periodo` atual (regra de horário — ver 4.4) e `data` de hoje.
2. Verificar, via repositório, se já existe turno aberto no dia (qualquer período) → `TurnoJaAbertoError`.
3. Verificar se já existe registro (aberto ou fechado) para `(data, periodo)` → `PeriodoJaRegistradoError`.
4. Construir entidade `CaixaTurno` e persistir com os valores **efetivamente contados e confirmados** pela operadora — nunca os valores sugeridos sem confirmação (ver 4.1.1).
5. Verificar se existem `CorrecaoPendente` com status `pendente` (ADR-002, Decisão 2) — não bloqueia a abertura, apenas acompanha a resposta.
6. Auditar `abrir_caixa`.
7. Retornar `{ id, data, periodo, status: 'aberto', correcoes_pendentes: [ { id, venda_id, motivo, solicitado_por, criado_em } ] }`.

### 4.1.1 Caso de uso `SugerirFundoAbertura` *(novo em relação ao V1)*
**Objetivo:** reduzir digitação repetitiva do valor fixo de troco (ex.: R$ 40 espécie + R$ 10 moedas), sem eliminar a contagem física obrigatória.

**Entrada:** nenhuma.
**Fluxo:**
1. Buscar o último turno fechado (independente do período) via repositório.
2. Retornar `fundo_especie` e `fundo_moedas` desse último fechamento como **sugestão de preenchimento**, não como valor final.
3. Se não houver turno anterior (primeiro uso do sistema), retornar `0` para ambos.

**Regra de negócio:** este valor é sempre apenas uma sugestão pré-preenchida no formulário de abertura — a operadora deve contar fisicamente o dinheiro e confirmar (ou corrigir) antes de enviar `AbrirCaixa`. O backend nunca abre um turno com o valor sugerido automaticamente sem uma submissão explícita do formulário; o pré-preenchimento é responsabilidade da camada de apresentação (frontend), este caso de uso só fornece o dado.

### 4.2 Caso de uso `PreverFechamento` *(novo em relação ao V1 — requisito do PRD-backend §4.7 e PRD-004 frontend)*
**Entrada:** nenhuma (usa o turno aberto do executor/loja).
**Fluxo:**
1. Buscar turno aberto → se não houver, `NenhumTurnoAbertoError`.
2. Agregar totais de `fluxo_caixa` do turno (mesma query do cálculo de esperado).
3. Calcular `esperado` via `FechamentoCaixa` (sem persistir nada).
4. Retornar `{ turno_id, periodo, esperado: { dinheiro, pix, cartao } }` — **somente leitura**, não altera o status do turno.

### 4.3 Caso de uso `FecharCaixa`
**Entrada:** `{ turno_id, contado_dinheiro, contado_pix, contado_cartao, contado_moedas, observacao, sem_impressao }`, executor.

> **Correção de design (2026-08-16):** a versão anterior buscava "o turno aberto" em vez de um `turno_id` explícito. Isso quebrava a idempotência na prática — depois do primeiro fechamento, não existe mais "turno aberto" para encontrar, e a segunda chamada (ex.: duplo clique, retry de rede) caía em `NenhumTurnoAbertoError` em vez de devolver o resumo já calculado. A correção: o frontend sempre informa qual turno está fechando (ele já tem esse id, vindo de `GET /status` ou do `preview-fechamento`), e o backend busca por ID, não por status.

**Fluxo:**
1. Buscar turno por `turno_id` → se não existir, `TurnoNaoEncontradoError` (404).
2. Se o turno encontrado já estiver `status === 'fechado'`: retornar o resumo já persistido (esperado, contado, diferença, status_resumo) **sem recalcular nada** — isso é a idempotência de verdade, cobrindo duplo clique e retry de rede.
3. Se `status === 'aberto'`: calcular `esperado` (mesma lógica do `PreverFechamento`).
4. Calcular `diferenca` via `FechamentoCaixa`.
5. Persistir fechamento **dentro de uma transação SQL única** (`UPDATE ... WHERE id = ? AND status = 'aberto'`, condição atômica — cobre o caso de duas requisições concorrentes chegando ao mesmo tempo, que o Passo 2 sozinho não cobre).
6. Se a atualização não afetar nenhuma linha (outra requisição concorrente fechou primeiro, entre o Passo 3 e o Passo 5), buscar o turno já fechado e devolver o mesmo formato de resposta — mesmo tratamento do Passo 2.
7. Auditar `fechar_caixa`; se `sem_impressao === true`, auditar também `fechar_caixa_sem_impressao` (PRD-004 — rastreia o uso do caminho de exceção de impressão).
8. Retornar o resumo completo (esperado, contado, diferença, status_resumo).

### 4.4 Serviço de domínio `DeterminadorDePeriodo`
- Encapsula a regra `hora < 14 → manhã, senão tarde`, fuso `America/Recife`.
- Usado **apenas na abertura**. Nenhum outro ponto do sistema deve recalcular o período de um turno já existente — ele vem sempre do campo persistido.

### 4.5 Interface `CaixaTurnoRepository`
```text
buscarTurnoAberto(): CaixaTurno | null
buscarPorId(id): CaixaTurno | null
existeParaPeriodo(data, periodo): boolean
listarPorData(data): CaixaTurno[]
salvar(turno): CaixaTurno
fecharAtomico(id, dadosFechamento): { afetado: boolean }
```

### 4.6 Interface `FluxoCaixaRepository` (consumida por este módulo, mas pertence ao módulo de Fluxo)
```text
somarPorFormaEBTurno(turnoId, categorias[]): { forma: string, total: number }[]
```

---

## 5. Camada de infraestrutura (`src/modules/cash-register/infrastructure`)

- `MySQLCaixaTurnoRepository` — implementa o repositório com transação explícita no fechamento (`START TRANSACTION` / `COMMIT` / `ROLLBACK`).
- Índice único `(data, periodo)` a nível de banco reforça `PeriodoJaRegistradoError` mesmo sob concorrência (a checagem de aplicação sozinha, como no V1, não é suficiente contra condição de corrida).

---

## 6. Contratos de API

### 6.1 `GET /api/caixa-turno/status`
Requer token + permissão `caixa`.

**Query opcional:** `?data=YYYY-MM-DD&incluir_fechados=1`

**Response 200 (turno aberto)**
```json
{
  "aberto": true,
  "turno": {
    "id": 12, "data": "2026-08-11", "periodo": "tarde", "status": "aberto",
    "fundo_especie": 50.00, "fundo_moedas": 10.00,
    "esperado": { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 }
  }
}
```

**Response 200 (sem turno aberto)**
```json
{ "aberto": false, "turno": null }
```

---

### 6.2 `POST /api/caixa-turno/abrir`
Requer token + permissão `caixa`.

**Request**
```json
{ "fundo_especie": 50.00, "fundo_moedas": 10.00 }
```

**Response 200**
```json
{
  "id": 12, "data": "2026-08-11", "periodo": "tarde", "status": "aberto",
  "correcoes_pendentes": [
    { "id": 3, "venda_id": 481, "motivo": "Item lançado em dobro", "solicitado_por": "Isadora Karem", "criado_em": "2026-08-11T12:10:00-03:00" }
  ]
}
```
`correcoes_pendentes` vem vazio (`[]`) na maioria das aberturas — só aparece preenchido se houver venda de turno fechado aguardando resolução (ADR-002, Decisão 2). A UI deve exibir isso como aviso destacado, não como bloqueio.

**Erros**
| Status | Quando |
|---|---|
| 409 | já existe turno aberto no dia |
| 409 | período já registrado hoje |

---

### 6.3 `GET /api/caixa-turno/preview-fechamento` *(endpoint novo em relação ao V1)*
Requer token + permissão `caixa`.

**Response 200**
```json
{
  "turno_id": 12,
  "periodo": "tarde",
  "esperado": { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 }
}
```

**Erro**
| Status | Quando |
|---|---|
| 400 | não há turno aberto |

---

### 6.4 `POST /api/caixa-turno/fechar`
Requer token + permissão `caixa`.

**Request**
```json
{
  "turno_id": 12,
  "contado_dinheiro": 205.00, "contado_moedas": 5.50,
  "contado_pix": 340.00, "contado_cartao": 128.00,
  "observacao": "Faltou troco de R$ 5 na gaveta",
  "sem_impressao": false
}
```
`turno_id` (obrigatório): o frontend obtém esse valor de `GET /status` ou de `GET /preview-fechamento` antes de chamar o fechamento — nunca deduzido implicitamente pelo backend (ver correção de design na Seção 4.3).

`sem_impressao` (booleano, padrão `false`): `true` apenas quando o operador usou o caminho de exceção "Prosseguir sem impressão" (PRD-004, Seção 3). Quando `true`, o caso de uso `FecharCaixa` deve registrar isso explicitamente na auditoria (`fechar_caixa_sem_impressao`), além do registro normal de `fechar_caixa` — nunca bloqueia o fechamento em si.

**Response 200 (primeira chamada — fecha de verdade)**
```json
{
  "id": 12, "periodo": "tarde",
  "esperado": { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 },
  "contado":  { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 },
  "diferenca": { "dinheiro": 0, "pix": 0, "cartao": 0, "total": 0 },
  "status_resumo": "bateu certo",
  "idempotente": false
}
```

**Response 200 (chamada repetida com o mesmo `turno_id` — duplo clique ou retry de rede)**
```json
{
  "id": 12, "periodo": "tarde",
  "esperado": { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 },
  "contado":  { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 },
  "diferenca": { "dinheiro": 0, "pix": 0, "cartao": 0, "total": 0 },
  "status_resumo": "bateu certo",
  "idempotente": true
}
```
Mesmo formato, `idempotente: true`, resumo lido do que já foi persistido — nunca recalculado, nunca erro.

**Erro**
| Status | Quando |
|---|---|
| 404 | `turno_id` não corresponde a nenhum turno existente |

---

## 7. Regras de bloqueio de venda (consumidas pelo módulo de Vendas — ver SPEC futura)

- O caso de uso `CreateSale` do módulo de Vendas deve consumir `CaixaTurnoRepository.buscarTurnoAberto()` como **único ponto de checagem** — não deve haver middleware paralelo fazendo a mesma verificação de forma independente (corrige a duplicação identificada no V1 entre `exigirCaixaAberto.js` órfão e a checagem manual dentro do service).
- Código de erro de negócio retornado ao frontend quando bloqueado: `CAIXA_FECHADO`, HTTP 403.

---

## 8. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Sistema de caixa | Dois modelos coexistindo (`caixa_movimentos` vestigial + `caixa_turnos`) | Um único modelo (`caixa_turnos`) |
| Período do turno | Já corrigido na versão "Opção B" do V1 (fixado na abertura) — **mantido na V2** | Mantido, e reforçado como invariante de domínio imutável |
| Endpoint de prévia de fechamento | Não existe | `GET /api/caixa-turno/preview-fechamento` (novo) |
| Unicidade de `(data, periodo)` | Checagem apenas em nível de aplicação | Reforçada com índice único de banco |
| Checagem de "caixa aberto" para venda | Duplicada (middleware órfão + service) | Único ponto, dentro do caso de uso `CreateSale` |
| `turno_id` em `fluxo_caixa` | Nullable (compatibilidade com dados legados) | Obrigatório (V2 não carrega dados legados) |
| Cancelamento de venda de turno fechado | Permitido; estorno vai para o fluxo do dia da ação, distorcendo a conciliação do turno vigente | Não permitido diretamente; vira `CorrecaoPendente`, avisada na abertura do próximo turno e resolvida no turno atual (ADR-002, Decisão 2) |

---

## 9. Critérios de aceite técnicos

1. Abrir um segundo turno no mesmo período do mesmo dia falha mesmo sob requisições concorrentes (constraint de banco, não só checagem de aplicação).
2. `preview-fechamento` retorna o mesmo valor de `esperado` que o `fechar` calcularia no mesmo instante, sem alterar o status do turno.
3. Fechar o mesmo `turno_id` duas vezes seguidas (duplo clique ou retry de rede) retorna 200 com `idempotente: true` na segunda chamada, nunca `TurnoNaoEncontradoError` nem `NenhumTurnoAbertoError`.
4. O cálculo de `FechamentoCaixa` é testável por unidade, passando totais agregados diretamente, sem precisar de banco real.
5. `periodo` de um turno nunca muda entre abertura e fechamento, inclusive se a regra de corte de horário for alterada no meio do turno.
