# SPEC-BE-008 — Fluxo de Caixa

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `src/modules/cash-flow`
- **Depende de:** ADR-001, SPEC-BE-001 (executor/RBAC), SPEC-BE-002 (a tabela `fluxo_caixa` já existe desde lá, e já é usada por Caixa por Turno; este módulo formaliza a API por cima dela), SPEC-BE-007 (Vendas já lança automaticamente aqui)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.8

---

## 1. Objetivo técnico

Dar uma API própria à tabela `fluxo_caixa` (já definida na SPEC-BE-002, Seção 2.2, e já alimentada automaticamente por Vendas e por Caixa por Turno): lançamentos manuais (sangria, suprimento), listagem sempre por turno, e a regra de que só `admin` apaga lançamento automático.

**Este módulo não cria a tabela — ela já existe.** Só adiciona os casos de uso e rotas que faltavam.

---

## 2. Modelo de dados

Reaproveita `fluxo_caixa` (SPEC-BE-002, Seção 2.2), sem alteração de schema. Adiciona apenas os campos de soft delete, que ainda não estavam lá:

| Coluna nova | Tipo | Regras |
|---|---|---|
| `ativo` | `TINYINT(1)` | padrão `1`; `0` = excluído (soft delete) |
| `excluido_por` | `INT` FK `usuarios.id`, nulo | — |
| `excluido_em` | `DATETIME`, nulo | — |
| `motivo_exclusao` | `TEXT`, nulo | obrigatório no momento da exclusão |

---

## 3. Camada de domínio

### 3.1 Entidade `LancamentoFluxoCaixa`
**Invariantes:**
- `valor` deve ser maior que zero.
- `tipo` deve ser `entrada` ou `saida`.
- `turno_id` é sempre obrigatório — reforça a regra da SPEC-BE-002: nunca existe lançamento "solto" fora de um turno (diferente do V1, onde `turno_id` era anulável para compatibilidade com dados legados que a V2 não carrega).

### 3.2 Exceções de domínio
- `CaixaFechadoError` (403, reaproveitada da SPEC-BE-007) — lançamento manual exige turno aberto, mesma regra de Vendas.
- `ValorInvalidoError` (400)
- `LancamentoNaoEncontradoError` (404)
- `ExclusaoDeLancamentoAutomaticoNaoPermitidaError` (403) — não-admin tentando excluir lançamento com `gerado_auto = true`.

---

## 4. Camada de aplicação

### 4.1 `CreateLancamentoManual(tipo, descricao, categoria, forma, valor, executor)`
**Fluxo:**
1. `turno = CaixaTurnoRepository.buscarTurnoAberto()` — se não houver, `CaixaFechadoError`. Não faz sentido lançar sangria/suprimento num turno que não existe.
2. `turno_id` é **sempre** o turno atualmente aberto — nunca um valor escolhido pelo usuário (evita lançamento retroativo acidental num turno errado).
3. `data` é sempre a data de hoje.
4. `gerado_auto = false`.
5. Persiste.
6. Audita `criar_lancamento_manual`.

### 4.2 `DeleteLancamento(id, motivo, executor)`
**Fluxo:**
1. Busca o lançamento — se não existir, `LancamentoNaoEncontradoError`.
2. Se `gerado_auto === true` e `executor.role !== 'admin'` → `ExclusaoDeLancamentoAutomaticoNaoPermitidaError` (PRD backend §4.8: *"lançamentos automáticos não podem ser excluídos por operadores comuns"*).
3. Marca `ativo = 0`, `excluido_por`, `excluido_em`, `motivo_exclusao` — **nunca remove fisicamente**, mesmo lançamento manual.
4. Audita `excluir_lancamento_fluxo`.

**Nota:** lançamento manual pode ser excluído por qualquer usuário com permissão `fluxo`, não só admin — a restrição do PRD é específica para lançamento **automático**. Se essa distinção não for suficiente na prática (ex.: quiser restringir exclusão manual também a admin), isso é uma decisão de produto a confirmar, não algo que este módulo decide sozinho.

### 4.3 `ListLancamentos(filtros)`
Paginado. Filtros: `turno_id` (recomendado sempre informar — é o que resolve a divergência do V1, PRD backend §4.7/4.8), `categoria`, `tipo`, `gerado_auto`, `data_inicio`, `data_fim` (para consultas administrativas fora do escopo de um único turno).

### 4.4 `GetResumoPorTurno(turnoId)`

> **Correção de design (2026-08-18):** a versão original desta seção dizia que este cálculo deveria "reaproveitar exatamente a mesma query" do `FechamentoCaixa` (SPEC-BE-002, Seção 3.2). Isso estava errado — aquela query filtra propositalmente só `categoria IN ('vendas', 'estorno')`, porque o "esperado" do fechamento de caixa não deve contar sangria/suprimento manual. Copiar essa mesma restrição para o resumo da **tela de Fluxo de Caixa** fez com que lançamentos manuais (a razão de essa tela existir) nunca aparecessem no KPI, mesmo aparecendo corretamente na listagem linha por linha — um bug encontrado testando na prática.

Retorna totais agregados de entrada/saída por forma de pagamento, somando **todos os lançamentos ativos do turno, sem filtro de categoria** — inclui vendas, estornos, sangrias e suprimentos. Esta é uma agregação própria, distinta da usada por `FechamentoCaixa`, e as duas **não precisam bater** — divergem exatamente pela diferença de propósito: uma mostra o fluxo de dinheiro completo do turno, a outra mostra só o que é esperado encontrar fisicamente vindo de vendas.

---

## 5. Contratos de API

### 5.1 `POST /api/fluxo-caixa`
Requer token + permissão `fluxo`.

**Request**
```json
{ "tipo": "saida", "descricao": "Compra de sacolas", "categoria": "suprimento", "forma": "dinheiro", "valor": 25.00 }
```

**Response 200**
```json
{ "id": 55, "turno_id": 12, "tipo": "saida", "valor": 25.00 }
```

**Erro**
| Status | Quando |
|---|---|
| 403 `CAIXA_FECHADO` | sem turno aberto |
| 400 | `valor` ≤ 0 |

### 5.2 `GET /api/fluxo-caixa`
Requer token + permissão `fluxo`. Paginado.

**Query:** `?turno_id=12&categoria=sangria&tipo=saida&page=1&limit=20`

### 5.3 `DELETE /api/fluxo-caixa/:id`
Requer token + permissão `fluxo` (automático exige `admin` — Seção 4.2).

**Request**
```json
{ "motivo": "Lançamento duplicado por engano" }
```

**Erro**
| Status | Quando |
|---|---|
| 403 | não-admin tentando excluir lançamento automático |

### 5.4 `GET /api/fluxo-caixa/resumo`
Requer token + permissão `fluxo`.

**Query:** `?turno_id=12`

**Response 200**
```json
{ "entradas": { "dinheiro": 210.50, "pix": 340.00, "cartao": 128.00 }, "saidas": { "dinheiro": 25.00, "pix": 0, "cartao": 0 } }
```

---

## 6. Nota de escopo — exportação CSV

O PRD de frontend (`PRD-009-fluxo-de-caixa.md`) menciona exportação CSV. **Decisão: isso é responsabilidade do frontend**, gerado a partir dos dados já retornados por `GET /api/fluxo-caixa` — não precisa de um endpoint de backend dedicado. Volume de dados de uma padaria não justifica processamento no servidor para isso. Se o volume crescer no futuro a ponto de isso não ser mais viável no navegador, revisitar.

---

## 7. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| `turno_id` em `fluxo_caixa` | Anulável (compatibilidade com dados legados) | Obrigatório (já definido na SPEC-BE-002; este módulo reforça na camada de aplicação) |
| Filtro da tela de Fluxo vs. Fechamento de Turno | Critérios diferentes (data corrida vs. `aberto_em`), causando divergência | Ambos usam `turno_id`; `GetResumoPorTurno` reaproveita a mesma agregação de `FechamentoCaixa` |
| Exclusão de lançamento automático | Sem controle específico documentado | Restrita a `admin`, nunca remoção física |

---

## 8. Critérios de aceite técnicos

1. Criar lançamento manual sem turno aberto retorna `CAIXA_FECHADO`, nada é persistido.
2. `turno_id` de um lançamento manual é sempre o turno aberto no momento da criação, nunca um valor enviado pelo cliente.
3. Não-admin tentando excluir lançamento automático recebe 403; admin consegue.
4. Nenhuma exclusão remove fisicamente — sempre `ativo = 0` com motivo registrado.
5. O total retornado por `GET /api/fluxo-caixa/resumo?turno_id=X` inclui **todos** os lançamentos ativos do turno (vendas, estornos, sangrias, suprimentos) — nunca só vendas/estorno. Testável: criar um lançamento manual de entrada e confirmar que o KPI de entrada aumenta imediatamente.
6. Esse resumo **não precisa** bater com o "esperado" do fechamento de turno (SPEC-BE-002) — são cálculos com propósitos diferentes, e só coincidem quando não há lançamento manual nenhum no turno.
