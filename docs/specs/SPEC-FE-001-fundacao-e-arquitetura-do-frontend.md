# SPEC-FE-001 — Fundação e Arquitetura do Frontend

- **Status:** Rascunho para revisão
- **Data:** 2026-08-12
- **Módulo:** `frontend/src/core` (shell, roteamento, sessão, cliente HTTP) — base para todos os demais módulos de frontend
- **Depende de:** ADR-001 (Clean Code/SOLID), PRD-001 (Fundação e Arquitetura do Frontend), SPEC-001 (contrato de autenticação que este módulo consome)
- **Referência de comportamento:** `S-M-Panificadora` (V1) — `frontend/index.html`, `frontend/js/api.js`, `frontend/js/auth.js`, `frontend/js/app.js` (usados como referência funcional, não como base de código — ver ADR-001)

---

## 1. Objetivo técnico

Especificar a base técnica do frontend: como o app inicializa, como os módulos de negócio se registram e são carregados, como o cliente HTTP central funciona, e como a sessão é tratada — de forma que cada PRD de módulo (PDV, Estoque, Produtos etc.) possa ser implementado de forma isolada, sem duplicar essa lógica.

---

## 2. Stack e decisões técnicas

- **Sem framework, sem bundler obrigatório** — mantém a linha do V1 (ADR-001 recomenda usar o V1 como referência funcional, não arquitetural; aqui a decisão de "sem build step" é mantida por ser um requisito operacional real: rodar em qualquer PC de loja).
- **ES Modules nativos do navegador** (`<script type="module">`), em vez de um único arquivo `app.js` de 62KB como no V1 — isso é o que resolve, na prática, a violação de responsabilidade única identificada na PRD-001.
- Nenhuma dependência externa obrigatória. Bibliotecas de terceiros (se necessárias em algum módulo específico, ex. gráficos) são carregadas via `<script>` isolado, nunca via bundler.

---

## 3. Estrutura de pastas

```
frontend/
  index.html                 # shell autenticado
  login.html                 # tela de login (fora do shell)
  src/
    core/
      api.js                 # cliente HTTP central
      session.js             # sessão, token, permissões
      router.js               # troca de módulo/tela dentro do shell
      utils.js                # formatação de moeda/data, debounce etc.
    modules/
      auth/
      pdv/
      caixa-turno/
      produtos/
      estoque/
      producao/
      encomendas/
      fluxo-caixa/
      perdas/
      clientes/
      relatorios/
      usuarios/
      configuracoes/
    shared/
      components/            # elementos de UI reaproveitados entre módulos
```

Cada pasta em `modules/` corresponde a um PRD de frontend (PRD-003 a PRD-014) e será detalhada em sua própria SPEC. Este documento cobre apenas `core/`.

---

## 4. `core/api.js` — cliente HTTP central

### 4.1 Responsabilidade
Único ponto do sistema que chama `fetch()` contra a API. Nenhum módulo de negócio deve montar `fetch()` diretamente (requisito da PRD-001, Seção 3.2).

### 4.2 Interface
```js
// api.js
export async function apiGet(caminho, params)
export async function apiPost(caminho, corpo)
export async function apiPut(caminho, corpo)
export async function apiDelete(caminho)
```

### 4.3 Comportamento
1. Monta a URL a partir de uma base configurável (`API_BASE_URL`).
2. Anexa `Authorization: Bearer <token>` automaticamente, lendo o token via `session.js` — nenhum módulo de negócio manipula o header manualmente.
3. Se a resposta for `401`:
   - chama `session.limparSessao()`;
   - redireciona para `login.html`;
   - a `Promise` da chamada original rejeita com um erro específico (`SessaoExpiradaError`), que os módulos podem ignorar com segurança (o redirecionamento já cobre a UX).
4. Se a resposta for `4xx`/`5xx` (exceto 401): lança `ApiError` com `{ status, mensagem }`, onde `mensagem` vem do corpo de erro padronizado do backend (`{ "erro": "..." }` ou equivalente definido nas SPECs de backend) — nunca expõe stack trace ou corpo bruto ao chamador.
5. Erro de rede (sem resposta do servidor): lança `ErroDeRedeError`, com mensagem genérica amigável ("Não foi possível conectar. Verifique sua internet.").

### 4.4 Exceções expostas
```text
ApiError            { status, mensagem }
SessaoExpiradaError { }
ErroDeRedeError      { }
```
Cada módulo decide como exibir isso na UI (toast, mensagem inline), mas a captura/classificação do erro é sempre feita aqui, nunca duplicada em cada módulo.

---

## 5. `core/session.js` — sessão e permissões

### 5.1 Interface
```js
export function salvarSessao(token, usuario)
export function limparSessao()
export function getToken()
export function getUsuario()          // { id, nome, username, role, permissoes }
export function estaAutenticado()     // boolean
export function temPermissao(modulo)  // boolean — true sempre se role === 'admin'
```

### 5.2 Armazenamento
- Token e dados do usuário guardados em `localStorage` (sobrevive ao fechar a aba, mas fica só naquele navegador — adequado ao uso em PC de loja compartilhado, desde que o logout seja sempre explícito no fim do turno).
- `temPermissao()` reflete exatamente a mesma regra do backend (SPEC-001, Seção 3.1): admin sempre `true`; operador verifica a lista de `permissoes`.

### 5.3 Guarda de rota
- `index.html` (shell), ao carregar, chama `estaAutenticado()`. Se `false`, redireciona imediatamente para `login.html`, antes de tentar montar qualquer módulo ou fazer qualquer chamada de API.
- `login.html`, ao carregar, chama `estaAutenticado()`. Se `true`, redireciona direto para `index.html` — evita logar de novo sem necessidade.

---

## 6. `core/router.js` — troca de módulo dentro do shell

### 6.1 Contrato de módulo
Cada módulo de negócio (`modules/pdv`, `modules/estoque` etc.) exporta um objeto padrão:
```js
// modules/pdv/index.js
export default {
  id: 'pdv',
  label: 'Vendas',
  icone: 'ti-shopping-cart',
  permissao: 'caixa',
  async montar(container) { /* renderiza dentro do container */ },
  desmontar() { /* limpa listeners, intervals, etc. */ }
}
```

### 6.2 Responsabilidade do router
1. Mantém um registro de todos os módulos disponíveis (import estático de cada `modules/*/index.js`).
2. Monta o menu principal filtrando apenas módulos cujo `permissao` o usuário logado possui (`session.temPermissao(modulo.permissao)`), conforme PRD-001 Seção 3.1 e PRD-013.
3. Ao trocar de tela: chama `desmontar()` do módulo atual (se existir) antes de chamar `montar()` do novo — evita vazamento de listeners/intervals entre módulos, problema que o `app.js` monolítico do V1 não tinha como isolar.
4. Nunca recarrega a página inteira ao trocar de módulo — troca apenas o conteúdo do container central.

---

## 7. `core/utils.js` — utilitários compartilhados

Funções puras, sem estado e sem regra de negócio:
```js
export function formatarMoeda(valor)          // 1234.5 → "R$ 1.234,50"
export function formatarData(isoString)       // "2026-08-12T08:01:00Z" → "12/08/2026"
export function debounce(fn, atrasoMs)
```
Nenhuma lógica de negócio (ex. cálculo de diferença de caixa) pertence a este arquivo — isso fica no módulo de domínio correspondente.

---

## 8. Fluxo de inicialização

1. `index.html` carrega `core/session.js` → verifica `estaAutenticado()`.
2. Se autenticado: carrega `core/router.js`, que monta o menu (filtrado por permissão) e o primeiro módulo padrão (ex.: PDV).
3. Cada chamada de API feita pelos módulos passa por `core/api.js`, que trata 401 de forma centralizada.
4. Logout (ação do usuário): `session.limparSessao()` + redireciona para `login.html`.

---

## 9. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Organização de código | `app.js` único (62KB) com lógica de todas as telas | Um módulo ES por área de negócio, com contrato padrão (`montar`/`desmontar`) |
| Chamadas HTTP | Centralizadas em `api.js`, mas tratamento de 401 replicado | Tratamento de 401 único, dentro do próprio `api.js` |
| Guarda de rota | Implícita, checada em pontos variados | Explícita, checada uma vez na inicialização do shell e do login |
| Troca de tela | `showTab()` direto manipulando DOM | Router com contrato de módulo (`montar`/`desmontar`), evita vazamento de estado entre telas |

---

## 10. Critérios de aceite técnicos

1. Nenhum arquivo fora de `core/api.js` contém uma chamada `fetch()` direta.
2. Uma resposta 401 em qualquer chamada de qualquer módulo redireciona para login exatamente uma vez, sem loop.
3. Acessar `index.html` sem sessão válida nunca chega a montar nenhum módulo de negócio nem faz nenhuma chamada de API antes de redirecionar.
4. Trocar de módulo chama `desmontar()` do módulo anterior antes de `montar()` do novo.
5. O menu principal reflete exatamente as permissões do usuário logado, sem exigir recarregar a página.
