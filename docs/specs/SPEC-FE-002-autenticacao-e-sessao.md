# SPEC-FE-002 — Autenticação e Sessão

- **Status:** Rascunho para revisão
- **Data:** 2026-08-14
- **Módulo:** `frontend/src/modules/auth` (login, guarda de rota, logout, identidade do operador) — primeira tela de negócio sobre o shell
- **Depende de:** ADR-001 (Clean Code/SOLID), PRD-002 (Autenticação e Sessão), SPEC-FE-001 (core já implementado), SPEC-BE-001 (contrato de `POST /api/auth/login`)
- **Referência de comportamento:** `S-M-Panificadora` (V1) — `frontend/login.html`, `frontend/js/auth.js` (referência funcional, não base de código — ver ADR-001)

---

## 1. Objetivo técnico

Especificar o fluxo de entrar, permanecer e sair do sistema, de forma que cada fatia seja implementada e confirmada no navegador antes da próxima — sem redesenhar o core e sem misturar tela de login com guarda de rota.

Ao terminar, um operador consegue autenticar com usuário/senha reais, o shell recusa acesso sem sessão, o logout limpa o armazenamento local, e um 401 durante o uso devolve o usuário ao login uma única vez (comportamento já centralizado em `core/api.js`).

---

## 2. Stack e decisões técnicas

Herdadas da SPEC-FE-001 — não reabrir:

- Sem framework, sem bundler obrigatório; ES Modules nativos (`<script type="module">`).
- Nenhuma dependência externa.
- **Nenhum `fetch()` fora de `core/api.js`.** Login, identidade visual e qualquer outra chamada desta SPEC passam por `apiGet` / `apiPost`.
- Sessão, token e permissões **não** são reimplementados. Este módulo só chama a interface já exportada por `core/session.js`.

`login.html` permanece uma página separada, fora do shell autenticado (padrão do V1 e da SPEC-FE-001). O módulo `auth` **não** é um item de menu do `router.js` — não tem `id`/`permissao`/`montar` de tela de negócio.

---

## 3. Estrutura de pastas

Só o que esta SPEC cria ou passa a possuir. `core/` já existe e não é redefinido.

```
frontend/
  login.html                      # já existe (SPEC-FE-001); este módulo passa a controlá-lo
  index.html                      # já existe (SPEC-FE-001); este módulo liga guarda, logout e identidade
  src/
    core/                         # PRONTO — não alterar o contrato (ver Seção 4)
    modules/
      auth/
        login.js                  # submit do formulário → API → sessão
        guarda.js                 # redirecionamentos de entrada (shell e login)
        sair.js                   # logout explícito
```

Arquivos nascem no passo que os exige, não todos de uma vez. Não criar nesta SPEC as pastas de PDV, Estoque, etc.

---

## 4. Contratos já prontos (não redefinir)

Esta SPEC **consome** as interfaces abaixo. Qualquer mudança nessas assinaturas pertence a uma revisão da SPEC-FE-001, não a um atalho aqui.

### 4.1 `core/session.js`

```js
export function salvarSessao(token, usuario)  // usuario: { id, nome, username, role, permissoes }
export function limparSessao()
export function getToken()
export function getUsuario()
export function estaAutenticado()             // boolean — presença de token, não validade JWT
export function temPermissao(modulo)
```

Armazenamento: `localStorage`, chaves já definidas pelo core (`CHAVE_STORAGE_TOKEN`, `CHAVE_STORAGE_USUARIO`). Este módulo não inventa outra chave nem usa `sessionStorage` para token, usuário, senha ou logo.

### 4.2 `core/api.js`

```js
export async function apiGet(caminho, params)
export async function apiPost(caminho, corpo)
export class ApiError            // { status, mensagem }
export class SessaoExpiradaError
export class ErroDeRedeError
```

Comportamentos que o módulo `auth` **aproveita** e **não duplica**:

- Header `Authorization` anexado só quando há token.
- `401` **com** token: `limparSessao()` + redirect para `login.html` + `SessaoExpiradaError`.
- `401` **sem** token: `ApiError` (é o caso do login com credencial inválida — não pode ser tratado como sessão expirada, senão a tela de login entra em loop).
- Rede: `ErroDeRedeError` com a mensagem já definida no core.

### 4.3 `core/router.js`

O login não registra módulo no router. Depois de autenticado, `index.html` inicia o router como a SPEC-FE-001 já descreve. Esta SPEC não altera o contrato `montar` / `desmontar`.

---

## 5. Contrato HTTP consumido (SPEC-BE-001)

Único endpoint obrigatório desta SPEC. Path relativo ao `API_BASE_URL` do core (padrão `/api`):

### `POST /auth/login` — público

**Request**

```json
{ "username": "admin", "senha": "••••••" }
```

**Response 200**

```json
{
  "token": "eyJhbGciOi...",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "username": "admin",
    "role": "admin",
    "permissoes": ["caixa", "encomendas", "estoque", "fluxo", "rel", "produtos", "producao", "perdas", "clientes"]
  }
}
```

O objeto `usuario` da resposta é passado **inteiro** a `salvarSessao(token, usuario)`. Não remapear `role` ↔ `papel` nem filtrar `permissoes` no frontend.

**Erros (exibir `ApiError.mensagem` na tela, sem traduzir nem especializar)**

| Status | Mensagem esperada do backend | Quando |
|---|---|---|
| 400 | `Informe usuário e senha.` | campo ausente |
| 401 | `Usuário ou senha incorretos.` | usuário inexistente, inativo ou senha errada (mesma mensagem para os três) |
| 429 | a que o backend enviar | rate limit (5 tentativas / 15 min por IP) |

O frontend **nunca** decide se o erro foi “usuário não existe” ou “senha errada”. A mensagem na tela é a do `ApiError` (ou a de rede do core). Não logar `senha` nem `token` no console.

---

## 6. Ordem incremental de implementação

Regra de execução: **um passo só começa quando o anterior foi confirmado no navegador** (e, quando houver, no `npm test` da fatia). Não entregar login + guarda + logout num único diff “para testar no final”.

Se a SPEC-FE-001 já deixou um esboço (formulário desabilitado, guarda inline, botão Sair), o passo correspondente **completa e isola** esse comportamento no módulo `auth` — não reescreve o core.

---

### Passo 1 — Tela de login estática (sem lógica de autenticação)

**Objetivo.** `login.html` é uma tela usável visualmente: marca da loja, campos Usuário e Senha, botão Entrar. Nenhuma chamada de API, nenhum `salvarSessao`, nenhuma guarda.

**Inclui**

- Markup do formulário (`#form-login`, `#username`, `#senha`, botão `type="submit"` visível e clicável).
- `preventDefault` no submit **somente** para a página não recarregar — o handler não chama `apiPost` nem grava storage.
- Texto padrão da loja (ex.: “S&M Panificadora”). Sem `sessionStorage` de logo/nome.

**Fora deste passo**

- `apiPost`, `salvarSessao`, mensagens de erro de credencial.
- Redirecionar `index.html` → `login.html` (isso é o Passo 3).
- Logout, nome do operador no shell, identidade visual via API.

**Como testar (navegador)**

1. Abrir `login.html` (via servidor estático da FE-001).
2. Ver o formulário, preencher os campos, clicar em Entrar.
3. A página **não** navega para `index.html`, **não** dispara request de login na aba Network, **não** grava token no `localStorage`.

**Pronto quando:** a tela existe e o submit é inerte. Só então o Passo 2.

---

### Passo 2 — Login real via `core/api.js` e persistência via `core/session.js`

**Objetivo.** Credenciais válidas entram no sistema. Credenciais inválidas mostram mensagem genérica. Ainda **não** existe guarda de rota: o teste deste passo é “logar com usuário real e cair no shell”, não “abrir o shell sem sessão”.

**Arquivo:** `frontend/src/modules/auth/login.js`

```js
export async function autenticar(username, senha)
export function iniciarFormularioLogin(formulario)
```

**Comportamento de `autenticar`**

1. Recusar username/senha vazios no cliente (não chamar a API). A mensagem pode ser a de 400 do backend (`Informe usuário e senha.`) ou o `required` do HTML — sem inventar texto que enumere usuário vs senha.
2. `username` enviado com `trim` (o backend normaliza para minúsculas; o frontend não precisa reimplementar a invariante, só não deve mandar espaços nas bordas).
3. Chamar **apenas** `apiPost('/auth/login', { username, senha })`.
4. Sucesso: `salvarSessao(resposta.token, resposta.usuario)` e `location.replace('index.html')`.
5. Falha: não chamar `salvarSessao`. Mostrar `erro.mensagem` (se `ApiError` ou `ErroDeRedeError`) num elemento visível do formulário (ex.: `#login-erro`), sem stack e sem corpo bruto.
6. `SessaoExpiradaError` no login não deve ocorrer (não há token). Se ocorrer, tratar como falha genérica — não reimplementar redirect.

**Comportamento da UI neste passo**

- Desabilitar o botão Entrar enquanto a Promise não resolve (evita duplo submit / 429 desnecessário).
- Reabilitar ao terminar, com sucesso ou erro.
- Senha permanece `type="password"`. Nenhum `console.log` de senha, token ou resposta completa em produção.

**Fora deste passo**

- Guarda de `index.html` (Passo 3).
- Botão Sair (Passo 4).
- Recusar `login.html` quando já autenticado (Passo 6).

**Como testar (navegador, backend da SPEC-BE-001 no ar)**

1. Abrir `login.html`, entrar com usuário **válido** e ativo.
2. Conferir no Application/`localStorage`: token e JSON do usuário gravados nas chaves do core.
3. A URL vira `index.html` e o shell aparece.
4. Voltar a `login.html` (ainda sem Passo 6) e tentar senha **errada**: a tela permanece no login, mostra “Usuário ou senha incorretos.” (ou a `mensagem` do `ApiError`), `localStorage` **não** ganha token novo.
5. Na aba Network: um único `POST .../auth/login`; nenhum `fetch` montado fora de `api.js`.

**Pronto quando:** o caminho feliz e o 401 de credencial são reproduzíveis. Só então o Passo 3.

---

### Passo 3 — Guarda do shell (sem sessão → login)

**Objetivo.** Abrir `index.html` sem sessão válida **nunca** monta router, **nunca** chama API, e redireciona para `login.html`. Este passo **não** altera o formulário de login nem o `autenticar` do Passo 2.

**Arquivo:** `frontend/src/modules/auth/guarda.js`

```js
export function protegerShell(redirecionar = (url) => window.location.replace(url))
// retorna true se pode seguir; false se redirecionou
```

**Comportamento**

1. Se `estaAutenticado() === false`, chamar `redirecionar('login.html')` e retornar `false`.
2. Se `true`, retornar `true` — `index.html` só então mostra o shell e importa `router.js` (já exigido pela SPEC-FE-001).
3. Não validar JWT no cliente. Token presente = autenticado para esta guarda; validade é o 401 do core (Passo 7).

`index.html` deixa de espalhar a condição: importa `protegerShell` e, se `false`, não executa o restante. A guarda síncrona por `localStorage` (chave do core) pode permanecer como fallback de `file://`, desde que use a **mesma** chave — não uma terceira.

**Fora deste passo**

- Redirect de `login.html` quando já autenticado (Passo 6).
- Logout (Passo 4).
- Qualquer mudança em `login.js`.

**Como testar (navegador)**

1. Garantir `localStorage` sem token (Application → limpar, ou janela anônima).
2. Abrir `index.html` → cai em `login.html` **antes** de aparecer menu/conteúdo.
3. Network: nenhuma chamada autenticada disparada por essa abertura.
4. Logar (Passo 2) e abrir `index.html` de novo: o shell permanece; não volta ao login.

**Pronto quando:** os dois sentidos (sem token / com token) foram vistos no navegador. Só então o Passo 4.

---

### Passo 4 — Logout

**Objetivo.** O operador sai de propósito: sessão local some e a próxima tela é o login.

**Arquivo:** `frontend/src/modules/auth/sair.js`

```js
export function sair(redirecionar = (url) => window.location.replace(url))
```

**Comportamento**

1. `limparSessao()` — remove token **e** usuário (as duas chaves do core).
2. `redirecionar('login.html')`.
3. Não chamar endpoint de logout (SPEC-BE-001 não define um). Encerrar sessão é só local + expiração do JWT no servidor.

O botão `#btn-logout` (“Sair”) no topo do `index.html` chama `sair()`. Deve estar visível no shell autenticado.

**Fora deste passo**

- Tratar 401 (já é o core; Passo 7 só confirma).
- Guarda inversa do login (Passo 6).

**Como testar (navegador)**

1. Estar logado no shell.
2. Clicar em Sair.
3. URL = `login.html`.
4. `localStorage` sem as chaves de sessão.
5. Abrir `index.html` de novo → a guarda do Passo 3 devolve ao login.
6. O botão Voltar do navegador não deve reexibir o shell autenticado com token ainda válido (por isso `replace`, não `href` / `assign`).

**Pronto quando:** sair + tentar reabrir o shell está reproduzível. Só então o Passo 5.

---

### Passo 5 — Nome e papel do operador no shell

**Objetivo.** Com sessão válida, o topo do shell mostra quem está logado — requisito da PRD-002, separado do logout para poder ser confirmado sozinho.

**Comportamento**

- Depois de `protegerShell()` retornar `true`, ler `getUsuario()` e preencher `#usuario-logado` com nome e papel visíveis, no formato `Nome (admin)` ou `Nome (operador)` — `role` exatamente como veio do backend.
- Se `getUsuario()` for `null` apesar do token (storage corrompido), tratar como não autenticado: `limparSessao()` + mesma saída do Passo 3. Não montar o router.

**Fora deste passo:** menu por permissão (já é `router.js` / FE-001); CRUD de usuários (PRD-013).

**Como testar (navegador)**

1. Entrar como admin → o topo mostra o nome do admin e `(admin)`.
2. Sair, entrar como operador (quando existir) → nome do operador e `(operador)`.
3. Recarregar `index.html` com a sessão ainda válida → o rótulo permanece, sem novo login.

**Pronto quando:** o rótulo reflete o `usuario` gravado no Passo 2. Só então o Passo 6.

---

### Passo 6 — Guarda inversa do login (já autenticado → shell)

**Objetivo.** Quem já tem sessão e abre `login.html` não vê o formulário de novo. Separado da guarda do shell (Passo 3) porque o teste é outro: “logado, forçar a URL de login”.

**Estende** `guarda.js` (não misturar com `login.js`):

```js
export function redirecionarSeAutenticado(redirecionar = (url) => window.location.replace(url))
// retorna true se redirecionou para index.html
```

**Comportamento**

- Se `estaAutenticado()`, `redirecionar('index.html')` e não ligar `iniciarFormularioLogin`.
- Se não, permanecer na tela e seguir o Passo 1/2.

**Como testar (navegador)**

1. Logar (Passo 2).
2. Na barra de endereço, abrir `login.html`.
3. Voltar imediatamente para `index.html`, sem ver (ou sem conseguir submeter) um segundo login.
4. Sair (Passo 4) e abrir `login.html` → o formulário aparece.

**Pronto quando:** os dois sentidos desta guarda inversa foram vistos. Só então o Passo 7.

---

### Passo 7 — Token expirado durante o uso (não reimplementar 401)

**Objetivo.** Confirmar, no fluxo real de sessão, o que a SPEC-FE-001 já exige do core: qualquer `401` **com** token limpa a sessão e manda para `login.html` uma vez. O módulo `auth` **não** adiciona outro `if (status === 401)`.

**Comportamento**

- Nenhuma tela desta SPEC captura `SessaoExpiradaError` para redirecionar de novo.
- Capturar essa exceção, se necessário, só para não pintar erro vermelho no formulário depois que o redirect já saiu.

**Como testar (navegador)**

1. Logar. No `localStorage`, trocar o token por um valor inválido (sessão “presente”, JWT morto).
2. Disparar qualquer chamada autenticada via `apiGet`/`apiPost` (rota protegida do backend quando existir; até lá, um disparo de fumaça temporário no shell é aceitável **neste passo** e deve ser removido depois, ou o teste automatizado da FE-001 em `api.js` conta como prova de unidade).
3. Resultado: `login.html`, storage limpo, um único redirect (recarregar o login não gera loop).
4. Logar de novo com credencial válida → shell volta ao normal.

**Pronto quando:** expiração não exige clique em Sair. Só então o Passo 8.

---

### Passo 8 — Identidade visual da tela de login sem cache de sessão anterior

**Objetivo.** Cumprir a correção da PRD-002 Seção 5: nome/logo **não** vêm de `sessionStorage` de um login passado. Um navegador novo não fica “errado” até a primeira autenticação.

**Dependência externa.** O GET público de configuração é do módulo de configurações (PRD-014 / spec de backend correspondente). Esta SPEC **não** define CRUD de config nem upload de logo.

**Comportamento**

1. Na abertura de `login.html` (depois da guarda inversa do Passo 6, se não redirecionou), buscar a identidade via `apiGet` no path público que a spec de configurações publicar.
2. Sucesso: aplicar `nome` (e logo, se a resposta trouxer URL) no título da tela.
3. Falha de rede, 404 ou backend ainda sem o endpoint: manter o texto padrão do Passo 1. **O login dos Passos 1–2 continua funcionando.**
4. Proibido gravar nome/logo em `sessionStorage` “para a próxima visita”. Proibido exigir token para essa leitura.

**Como testar (navegador)**

1. Janela anônima (sem `localStorage`/`sessionStorage` de visita anterior).
2. Abrir `login.html`: ou o nome/logo do GET público, ou o padrão do Passo 1 — nunca um valor “fantasma” de outra sessão.
3. Confirmar na Network que, se a chamada existir, é GET público (sem `Authorization`) e que uma falha dela não impede preencher usuário/senha e entrar.

**Pronto quando:** navegador novo não depende de cache de login antigo. Com isso esta SPEC fecha.

---

## 7. Regras transversais (todos os passos)

1. Um único ponto de `fetch`: `core/api.js`.
2. Um único ponto de 401 autenticado: `core/api.js`. `auth` não copia esse `if`.
3. Mensagem de credencial inválida é genérica — alinhada à SPEC-BE-001 (`CredenciaisInvalidasError` / “Usuário ou senha incorretos.”).
4. Sem senha, token ou payload de login no `console` em produção.
5. Redirects de auth usam `location.replace` para não empilhar o shell no histórico.
6. `estaAutenticado()` é presença de token. Não decodificar JWT no cliente.

---

## 8. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Onde vive a lógica de login | Misturada em `auth.js` / tela | `modules/auth/login.js`, usando `apiPost` + `salvarSessao` já existentes |
| Guarda de rota | Implícita, pontos variados | Funções explícitas em `guarda.js`, passos de teste separados (shell ≠ login) |
| 401 no meio do uso | Tratamento espalhado | Só `core/api.js` (SPEC-FE-001); este módulo não duplica |
| Nome/logo no login | `sessionStorage` da visita autenticada anterior | GET público, com fallback; navegador novo não herda cache |
| Logout | Limpa storage de formas diversas | `sair()` → `limparSessao()` + `login.html` |

---

## 9. Fora de escopo desta SPEC

- SSO, 2FA, “lembrar-me” / sessão longa (PRD-002 Seção 6).
- Troca obrigatória de senha (`mustChangePassword`) — não está no contrato da SPEC-BE-001 consumido aqui.
- CRUD de usuários e edição de permissões (PRD-013 / SPEC-BE-001 seções 6.2–6.5).
- Tela de configurações, upload de logo, slogan editável (PRD-014). O Passo 8 só **lê** identidade pública.
- Qualquer módulo de negócio no router (PDV, Estoque, …).

---

## 10. Critérios de aceite técnicos

1. Os oito passos da Seção 6 foram implementados **nessa ordem**, cada um confirmado no navegador antes do seguinte.
2. `autenticar` usa `apiPost('/auth/login', { username, senha })` e `salvarSessao` — zero `fetch` em `modules/auth`.
3. Login 401 de credencial mostra mensagem genérica e **não** dispara o fluxo de `SessaoExpiradaError` (não há token na chamada).
4. `index.html` sem sessão redireciona para `login.html` sem montar router e sem chamar API (Passo 3, independente do formulário).
5. `login.html` com sessão redireciona para `index.html` (Passo 6, independente da guarda do shell).
6. Sair remove token e usuário do `localStorage` e cai no login (Passo 4).
7. O shell autenticado exibe nome e `role` do `getUsuario()` (Passo 5).
8. 401 com token, em qualquer chamada posterior, continua sendo só o core: um redirect, sem loop, sem segundo tratamento em `auth`.
9. Nome/logo da tela de login não são lidos de `sessionStorage` de sessão anterior (Passo 8).
10. Nenhum `console.log` de senha ou token no caminho feliz nem no de erro.
