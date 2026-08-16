# SPEC-BE-001 — Autenticação e Usuários (RBAC)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** `src/modules/users`
- **Depende de:** ADR-001 (Clean Code/SOLID), PRD-backend (Seções 4.1 e 4.2), PRD-002 (frontend) e PRD-013 (frontend)
- **Referência de comportamento:** `S-M-Panificadora` (V1) — `backend/routes/auth.js`, `backend/routes/usuarios.js`, `backend/middlewares/auth.js`, `backend/middlewares/permission.js`, tabela `usuarios`

---

## 1. Objetivo técnico

Especificar o modelo de dados, os contratos de API e a estrutura de classes do módulo de Autenticação e Usuários, na arquitetura em camadas definida pela ADR-001:
`Controller → Use Case → Domain → Repository Interface → Infrastructure → Database`.

---

## 2. Modelo de dados

### 2.1 Tabela `usuarios`

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `INT` PK auto_increment | — |
| `nome` | `VARCHAR(100)` | obrigatório |
| `username` | `VARCHAR(50)` | obrigatório, único, sempre salvo em minúsculas |
| `senha_hash` | `VARCHAR(255)` | obrigatório, gerado via bcrypt (custo 10) |
| `role` | `ENUM('admin','operador')` | obrigatório, padrão `operador` |
| `permissoes` | `JSON` | obrigatório, padrão `["caixa"]`; ignorado e sobrescrito para o conjunto completo quando `role = admin` |
| `ativo` | `TINYINT(1)` | padrão `1`; `0` = soft delete |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |

**Índice único:** `username` (garante unicidade a nível de banco, não só de aplicação).

**Valores válidos de permissão (whitelist):** `caixa`, `encomendas`, `estoque`, `fluxo`, `rel`, `produtos`, `producao`, `perdas`, `clientes` — os três últimos são adições da V2 em relação ao V1 (novos módulos previstos na ADR-001).

---

## 3. Camada de domínio (`src/modules/users/domain`)

### 3.1 Entidade `Usuario`

**Campos:** `id`, `nome`, `username`, `senhaHash`, `role`, `permissoes[]`, `ativo`.

**Invariantes (regras que a entidade garante sempre, independente de quem a chama):**
- `role` só pode ser `admin` ou `operador`.
- Se `role === 'admin'`, `permissoes` é sempre o conjunto completo da whitelist vigente — a entidade normaliza isso na construção, ignorando qualquer valor recebido para `permissoes` quando o papel é admin.
- Se `role === 'operador'`, `permissoes` só pode conter valores da whitelist; qualquer valor fora da whitelist é rejeitado na construção (erro de domínio, não silenciosamente ignorado).
- `username` é sempre normalizado para minúsculas e sem espaços nas bordas.

**Métodos de domínio:**
- `possuiPermissao(modulo: string): boolean` — `true` sempre se `admin`; caso contrário, verifica a lista.
- `podeSerDesativadoPor(usuarioSolicitanteId: number): boolean` — `false` se `usuarioSolicitanteId === this.id`.

### 3.2 Exceções de domínio
- `CredenciaisInvalidasError` (401)
- `PermissaoInvalidaError` (400) — valor de permissão fora da whitelist
- `UsuarioJaExisteError` (409) — username duplicado
- `AutoDesativacaoNaoPermitidaError` (400)

---

## 4. Camada de aplicação (`src/modules/users/application`)

### 4.1 Caso de uso `Login`
**Entrada:** `{ username, senha }`
**Fluxo:**
1. Buscar usuário ativo pelo `username` normalizado.
2. Se não encontrado → lançar `CredenciaisInvalidasError` (mensagem genérica, nunca revela se foi usuário ou senha).
3. Validar senha via bcrypt.
4. Se inválida → mesma exceção genérica.
5. Emitir JWT via serviço de token (interface `TokenService`, injetada — não `jsonwebtoken` diretamente no caso de uso).
6. Registrar auditoria (`login` ou `login_falhou`), best-effort — falha ao auditar nunca interrompe o fluxo de login.
7. Retornar `{ token, usuario }`.

### 4.2 Caso de uso `CreateUser`
**Entrada:** `{ nome, username, senha, role, permissoes }`, executor (`req.usuario`, deve ser admin — checagem de autorização é do controller/middleware, não do caso de uso).
**Fluxo:**
1. Validar campos obrigatórios (nome, username, senha).
2. Construir entidade `Usuario` (aplica as invariantes da Seção 3.1 automaticamente).
3. Verificar unicidade de `username` via repositório.
4. Gerar hash de senha via serviço de hash (interface, não `bcryptjs` direto no caso de uso).
5. Persistir via repositório.
6. Auditar criação.

### 4.3 Caso de uso `UpdateUser`
Mesma lógica de `CreateUser` para normalização de permissões; se `senha` não for enviada, mantém o hash atual.

### 4.4 Caso de uso `DeactivateUser`
**Entrada:** `{ usuarioAlvoId }`, executor.
**Fluxo:**
1. Se `usuarioAlvoId === executor.id` → lançar `AutoDesativacaoNaoPermitidaError`.
2. Persistir `ativo = 0` via repositório (nunca `DELETE`).
3. Auditar.

### 4.5 Interface `UsuarioRepository`
```text
buscarPorUsername(username): Usuario | null
buscarPorId(id): Usuario | null
listar(page, limit): { data: Usuario[], total: number }
salvar(usuario): Usuario
```

---

## 5. Camada de infraestrutura (`src/modules/users/infrastructure`)

- `MySQLUsuarioRepository` implementa `UsuarioRepository` usando o pool de conexões (`database/db.js`).
- `BcryptHashService` implementa a interface de hash (permite trocar algoritmo futuramente sem alterar os casos de uso).
- `JwtTokenService` implementa a interface de token, encapsulando `jsonwebtoken`, expiração configurável via `JWT_EXPIRES` (padrão 12h), e o payload do token.

**Payload do JWT (mantido do V1):**
```json
{ "id": 1, "nome": "Administrador", "username": "admin", "role": "admin", "permissoes": ["caixa","encomendas","estoque","fluxo","rel","produtos","producao","perdas","clientes"] }
```

---

## 6. Contratos de API

### 6.1 `POST /api/auth/login`
Público (sem token). Sujeito a rate limiting (5 tentativas / 15min por IP).

**Request**
```json
{ "username": "admin", "senha": "••••••" }
```

**Response 200**
```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": 1, "nome": "Administrador", "username": "admin", "role": "admin", "permissoes": ["caixa","..."] }
}
```

**Erros**
| Status | Código/erro | Quando |
|---|---|---|
| 400 | `Informe usuário e senha.` | campo ausente |
| 401 | `Usuário ou senha incorretos.` | usuário inexistente, inativo, ou senha errada (mesma mensagem para os três casos) |
| 429 | rate limit | mais de 5 tentativas em 15min no mesmo IP |

---

### 6.2 `GET /api/usuarios`
Requer token + `admin`. Paginado.

**Query:** `?page=1&limit=20`

**Response 200**
```json
{
  "data": [
    { "id": 1, "nome": "Administrador", "username": "admin", "role": "admin", "permissoes": ["..."], "ativo": 1, "criado_em": "2026-07-05T00:50:10Z" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "pages": 1, "hasPrevious": false, "hasNext": false }
}
```

---

### 6.3 `POST /api/usuarios`
Requer token + `admin`.

**Request**
```json
{ "nome": "Isadora Karem", "username": "isa", "senha": "••••••", "role": "operador", "permissoes": ["caixa", "encomendas"] }
```

**Response 200**
```json
{ "id": 2, "mensagem": "Usuário criado." }
```

**Erros**
| Status | Quando |
|---|---|
| 400 | campo obrigatório ausente |
| 400 | permissão fora da whitelist (novo em relação ao V1 — o V1 não validava isso) |
| 409 | `username` já existe |

---

### 6.4 `PUT /api/usuarios/:id`
Requer token + `admin`. Mesma validação de `POST`. Senha só é alterada se enviada.

**Response 200**
```json
{ "mensagem": "Usuário atualizado." }
```

---

### 6.5 `DELETE /api/usuarios/:id` (soft delete)
Requer token + `admin`.

**Response 200**
```json
{ "mensagem": "Usuário desativado." }
```

**Erro**
| Status | Quando |
|---|---|
| 400 | `Você não pode desativar seu próprio usuário.` |

---

## 7. Middlewares (`src/shared` / `src/modules/users/infrastructure`)

- `autenticar` — valida JWT, popula `req.usuario`. 401 se ausente/inválido/expirado.
- `apenasAdmin` — 403 se `req.usuario.role !== 'admin'`.
- `temPermissao(modulo)` — 403 se não-admin e módulo ausente em `req.usuario.permissoes`. Parsing de `permissoes` sempre defensivo: erro de formato nega acesso, nunca derruba o processo (mantido do V1).

---

## 8. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Validação de permissão na escrita | Aceita qualquer string em `permissoes` | Rejeita valor fora da whitelist (`PermissaoInvalidaError`) |
| Unicidade de `username` | Não há índice único explícito confirmado | Índice único a nível de banco |
| Acesso a `bcrypt`/`jsonwebtoken` | Direto nas rotas/middlewares | Sempre atrás de interface (`HashService`, `TokenService`), conforme ADR-001 §4.4 |
| Rota de debug pública | Existe (`/api/debug/*`) | Não existe; qualquer diagnóstico exige `admin` |

---

## 9. Critérios de aceite técnicos

1. Criar usuário com permissão fora da whitelist retorna 400, não é aceito silenciosamente.
2. `username` duplicado retorna 409, nunca gera dois registros.
3. Payload do JWT mantém compatibilidade com o formato consumido pelo frontend (PRD-002/PRD-013).
4. Nenhum caso de uso importa `bcryptjs` ou `jsonwebtoken` diretamente — apenas via interface injetada.
5. Testes de unidade cobrem: normalização de permissões para admin, rejeição de auto-desativação, rejeição de permissão inválida — sem necessidade de banco real.
