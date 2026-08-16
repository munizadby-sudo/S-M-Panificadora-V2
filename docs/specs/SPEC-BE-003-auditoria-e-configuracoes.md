# SPEC-BE-003 — Auditoria e Configurações

- **Status:** Rascunho para revisão
- **Data:** 2026-08-16
- **Módulo:** `src/modules/audit` (Auditoria) e `src/modules/settings` (Configurações)
- **Depende de:** ADR-001, SPEC-BE-001 (usuário executor, para registrar quem fez cada ação)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seções 4.13 (Configurações) e 4.14 (Auditoria)
- **Consumido por:** SPEC-FE-002 (tela de login busca nome/logo via endpoint público — resolve o 404 atual), SPEC-FE-003 (fundo de troco padrão pré-preenche a abertura de turno)

---

## 1. Objetivo técnico

Especificar dois módulos pequenos, mas usados por praticamente todo o resto do sistema: **Configurações** (parâmetros da loja, incluindo o fundo de troco padrão) e **Auditoria** (registro de quem fez o quê, consumido por todos os outros módulos de forma best-effort).

---

## 2. Modelo de dados

### 2.1 Tabela `configuracoes`
Chave/valor simples — cada linha é um parâmetro.

| Coluna | Tipo | Regras |
|---|---|---|
| `chave` | `VARCHAR(50)` PK | valor restrito à whitelist (Seção 2.1.1) |
| `valor` | `TEXT` | — |
| `atualizado_em` | `TIMESTAMP` | atualizado a cada `UPDATE`/`UPSERT` |
| `atualizado_por` | `INT` FK `usuarios.id` | nulo para valores de seed inicial |

### 2.1.1 Chaves conhecidas (whitelist)
| Chave | Uso | Pública (sem login)? |
|---|---|---|
| `nome_loja` | Nome exibido no shell e na tela de login | Sim |
| `slogan` | Subtítulo da loja | Sim |
| `logo_url` | Caminho do logotipo enviado | Sim |
| `fundo_troco_especie` | Valor padrão de espécie na abertura de turno (SPEC-FE-003) | Não — só autenticado |
| `fundo_troco_moedas` | Valor padrão de moedas na abertura de turno | Não — só autenticado |

Qualquer chave fora dessa whitelist é rejeitada na escrita (`ChaveConfiguracaoInvalidaError`).

### 2.2 Tabela `auditoria`

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `usuario_id` | `INT` FK `usuarios.id`, nulo | nulo em ações do sistema sem usuário (ex.: login falhou de usuário inexistente) |
| `acao` | `VARCHAR(60)` | ex.: `login`, `criar_usuario`, `fechar_caixa`, `fechar_caixa_sem_impressao` |
| `entidade` | `VARCHAR(50)` | ex.: `usuario`, `caixa_turno`, `venda` |
| `entidade_id` | `INT`, nulo | id do registro afetado, quando aplicável |
| `estado_antes` | `JSON`, nulo | snapshot antes da alteração, quando aplicável |
| `estado_depois` | `JSON`, nulo | snapshot depois da alteração, quando aplicável |
| `ip` | `VARCHAR(45)` | IP de origem da requisição |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

**Índices:** `(entidade, entidade_id)` e `(usuario_id, criado_em)` — suportam as duas consultas mais comuns (histórico de um registro; histórico de um usuário).

---

## 3. Camada de domínio

### 3.1 Serviço `Auditor` (`src/modules/audit/domain`)
```text
registrar({ usuarioId, acao, entidade, entidadeId, estadoAntes, estadoDepois, ip }): void
```
**Regra central (já definida no PRD backend, Seção 4.14):** este serviço é **best-effort** — se a escrita no banco falhar, o erro é capturado e logado no console/arquivo de log do servidor, **nunca propagado** para quem chamou. Nenhuma operação de negócio pode falhar por causa de um problema no registro de auditoria.

Todo módulo do sistema (Vendas, Caixa, Usuários, Estoque etc.) chama `Auditor.registrar()` diretamente — não existe uma API HTTP para *criar* auditoria, só para consultá-la (Seção 5.2).

### 3.2 Exceções de domínio
- `ChaveConfiguracaoInvalidaError` (400)
- `ArquivoLogoInvalidoError` (400) — tamanho ou tipo fora do permitido

---

## 4. Camada de aplicação

### 4.1 Configurações

**`GetConfiguracoesPublicas`** — sem autenticação.
Retorna apenas as chaves marcadas como públicas na whitelist (Seção 2.1.1): `nome_loja`, `slogan`, `logo_url`. Nunca retorna `fundo_troco_*`.

**`GetConfiguracoes`** — requer autenticação (qualquer usuário logado, não só admin — conforme PRD backend §4.13).
Retorna todas as chaves da whitelist.

**`UpdateConfiguracoes`** — requer `admin`.
1. Valida que toda chave enviada está na whitelist → senão `ChaveConfiguracaoInvalidaError`.
2. Faz upsert de cada chave, registrando `atualizado_por`.
3. Audita `atualizar_configuracoes` com estado antes/depois das chaves alteradas.

**`UploadLogo`** — requer `admin`.
1. Valida tamanho (máx. 3MB) e tipo (`image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`) → senão `ArquivoLogoInvalidoError`.
2. Salva o arquivo, faz upsert da chave `logo_url`.
3. Audita `atualizar_logo`.

### 4.2 Auditoria

**`ListarAuditoria`** — requer `admin`.
Paginado, com filtros opcionais: `entidade`, `entidade_id`, `usuario_id`, `acao`, `data_inicio`, `data_fim`.

---

## 5. Contratos de API

### 5.1 `GET /api/configuracoes/publico`
**Sem autenticação.** Este é o endpoint que a tela de login (SPEC-FE-002) deve consumir — resolve o 404 atual de `configuracoes/login`, que estava chamando um caminho que nunca existiu.

**Response 200**
```json
{ "nome_loja": "S&M Panificadora", "slogan": "Pão fresquinho todo dia", "logo_url": "/uploads/logo.png" }
```
Nunca retorna `fundo_troco_especie`/`fundo_troco_moedas`.

---

### 5.2 `GET /api/configuracoes`
Requer token (qualquer usuário autenticado).

**Response 200**
```json
{
  "nome_loja": "S&M Panificadora", "slogan": "Pão fresquinho todo dia", "logo_url": "/uploads/logo.png",
  "fundo_troco_especie": 40.00, "fundo_troco_moedas": 10.00
}
```

---

### 5.3 `PUT /api/configuracoes`
Requer token + `admin`.

**Request**
```json
{ "nome_loja": "S&M Panificadora", "slogan": "Pão fresquinho todo dia", "fundo_troco_especie": 40.00, "fundo_troco_moedas": 10.00 }
```

**Response 200**
```json
{ "mensagem": "Configurações atualizadas." }
```

**Erro**
| Status | Quando |
|---|---|
| 400 | chave fora da whitelist |

---

### 5.4 `POST /api/configuracoes/logo`
Requer token + `admin`. `multipart/form-data`, campo `logo`.

**Response 200**
```json
{ "logo_url": "/uploads/logo.png" }
```

**Erro**
| Status | Quando |
|---|---|
| 400 | arquivo maior que 3MB ou tipo não permitido |

---

### 5.5 `GET /api/auditoria`
Requer token + `admin`. Paginado.

**Query:** `?entidade=caixa_turno&entidade_id=12&page=1&limit=20`

**Response 200**
```json
{
  "data": [
    { "id": 501, "usuario_id": 1, "acao": "fechar_caixa", "entidade": "caixa_turno", "entidade_id": 12, "ip": "192.168.0.10", "criado_em": "2026-08-11T18:02:00-03:00" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1, "hasPrevious": false, "hasNext": false }
}
```

---

## 6. Correção necessária no frontend (a sinalizar)

O `login.js` (SPEC-FE-002) está chamando um caminho `configuracoes/login` que não corresponde a nenhum endpoint real — provavelmente um erro de digitação/concatenação. Com este SPEC pronto, a chamada correta passa a ser:
```js
apiGet('configuracoes/publico')
```
sem autenticação (não deve anexar `Authorization`, já que este é o único endpoint do sistema pensado para ser público — o `api.js` atual sempre tenta anexar o token se existir, o que não é um problema aqui, mas o backend não deve exigi-lo).

---

## 7. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Nome/logo na tela de login | Lido de `sessionStorage` (cache de sessão anterior); navegador novo mostra padrão até o primeiro login | Endpoint público `GET /api/configuracoes/publico`, sempre correto mesmo em navegador novo |
| Fundo de troco na abertura de caixa | Não existia como conceito; digitado do zero todo dia | Configurável (`fundo_troco_especie`/`moedas`), consumido pela abertura (SPEC-FE-003) |
| Cobertura de auditoria | Estoque, fluxo manual, perdas, encomendas e configurações não geravam auditoria | Cobertura obrigatória para todo módulo que altera dinheiro/estoque/configuração (PRD backend §4.14) |
| Falha ao gravar auditoria | Não especificado | Best-effort explícito — nunca interrompe a operação principal |

---

## 8. Critérios de aceite técnicos

1. `GET /api/configuracoes/publico` funciona sem token e nunca retorna `fundo_troco_*`.
2. `PUT /api/configuracoes` com uma chave fora da whitelist retorna 400, não é aceito silenciosamente nem cria coluna nova.
3. Uma falha simulada na escrita de auditoria (ex.: banco indisponível) não impede a operação principal de completar (testável forçando erro no `Auditor` e confirmando que o caso de uso chamador ainda retorna sucesso).
4. Upload de logo acima de 3MB ou de tipo não permitido é rejeitado antes de qualquer gravação.
5. `GET /api/auditoria` filtra corretamente por `entidade` + `entidade_id`, retornando o histórico de um registro específico (ex.: todas as ações de um turno de caixa).
