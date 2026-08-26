# ISSUE-008 — Seletor de cliente volta ao topo ao pesquisar e selecionar

- **Status:** Corrigido (2026-08-26)
- **Data:** 2026-08-26
- **Módulo:** `frontend/src/modules/clientes` (`seletor-cliente.js` → `montarSeletorCliente` / `renderizar`); `frontend/src/modules/encomendas` (`index.js` → `atualizarSeletorProdutoItem` / `renderizar`)
- **Severidade:** Média — no modal Nova encomenda o operador perde o ponto da tela (e o scroll do próprio modal) toda vez que escolhe um cliente **ou um produto**; o cadastro em si não quebra, mas o fluxo de digitação fica instável.
- **Relacionado:** SPEC-FE-009 (Passo 4 — `SeletorCliente` reaproveitável); SPEC-FE-011 (encomendas reutilizam `montarSeletorCliente` e a busca de produto nos itens); relato do operador na loja em 2026-08-26

---

## 1. Sintoma

Na tela **Encomendas**, ao abrir **Nova encomenda**:

1. Digitar no campo Cliente (ex.: "maria rapa") — a lista de resultados aparece.
2. Clicar em um resultado.
3. A janela (e o corpo do modal) **volta para o topo**. O cliente fica selecionado, mas a visão pula.

O mesmo salto acontece na busca de **Produto** (Itens do pedido): o operador desce o modal, pesquisa (ex.: "f" → Pão Francês), seleciona, e a tela volta para o campo Cliente no topo.

---

## 2. Causa

Duas origens, o mesmo sintoma:

1. `montarSeletorCliente` re-renderiza o seletor com `container.innerHTML = htmlSeletorCliente(estado)` a cada busca/seleção. Isso destrói o input com foco; o browser devolve o foco ao `body` e rola a janela (e o `.form-modal-corpo`) para o topo. O `mousedown` no resultado ainda tirava o foco da busca antes do `click`.

2. A busca/seleção de **produto** no formulário de encomenda chamava `renderizar()` da tela inteira. O modal era destruído e recriado com `scrollTop = 0` — por isso o salto continuou depois da correção só do seletor de cliente.

---

## 3. Correção aplicada

Seletor de cliente (`seletor-cliente.js`):

- Guarda `scrollY`, `scrollTop` do `.form-modal-corpo` e do overlay `.encomendas-modal` **antes** de reescrever o HTML e restaura depois (também no próximo frame).
- Recoloca o foco na busca com `focus({ preventScroll: true })`.
- Nos botões de resultado, `mousedown` chama `preventDefault()`.

Seletor de produto em encomendas (`index.js` / `formulario.js`):

- O HTML do produto fica em `#encomenda-item-seletor`; busca e seleção atualizam **só esse bloco** (`atualizarSeletorProdutoItem`), sem remontar o modal.
- Se o formulário inteiro precisar re-renderizar (adicionar item, validação), o `renderizar` também restaura o scroll do corpo e do overlay.
- O preço do catálogo passa a aparecer no "Selecionado" (antes saía "custo unitário ---" porque só iam id e nome).

---

## 4. Teste permanente (canário)

- `frontend/tests/clientes/passo4.test.js` — caso "busca e seleção restauram o scroll da janela (não voltam ao topo)"
- `frontend/tests/encomendas/passo2.test.js` — casos "formulário isola o seletor de produto para não remontar o modal a cada busca" e "busca e seleção de produto não zeram o scroll do modal"

Log bruto de `npm.cmd test` (frontend, canários desta issue):

```
cwd: c:\Users\Panificadora S&M\Desktop\PDV_2V\S-M-Panificadora-V2\frontend
command: npm.cmd test -- tests/encomendas/passo2.test.js tests/clientes/passo4.test.js

npm warn Unknown env config "devdir". This will error in a future major version of npm. See `npm help npmrc` for supported config options.
npm notice run test
npm notice run node --test tests/encomendas/passo2.test.js tests/clientes/passo4.test.js
▶ Passo 4 — SeletorCliente reaproveitável
  ✔ htmlSeletorCliente expõe busca e link de cadastro rápido (4.6054ms)
  ✔ htmlSeletorCliente exibe resultados e cliente selecionado (1.4362ms)
  ✔ index exporta montarSeletorCliente para SPEC-FE-010 (1.7018ms)
  ✔ montarSeletorCliente busca clientes e seleciona ao clicar (307.3883ms)
  ✔ cadastro rápido cria cliente e seleciona automaticamente (321.6732ms)
  ✔ busca e seleção restauram o scroll da janela (não voltam ao topo) (306.0731ms)
✔ Passo 4 — SeletorCliente reaproveitável (948.6634ms)
▶ Passo 2 — cadastro (cliente opcional) e itens estilo carrinho
  ✔ validarFormularioEncomenda exige nome, telefone, data válida e ao menos um item (4.6155ms)
  ✔ validarFormularioEncomenda aceita entrada válida e normaliza itens (3.0329ms)
  ✔ adicionarItem soma quantidade quando o mesmo produto é adicionado de novo (1.2601ms)
  ✔ removerItem tira o produto da lista (1.5628ms)
  ✔ totalLocalItens soma os subtotais — usado só como prévia, nunca enviado como total oficial (1.1795ms)
  ✔ criarEncomenda envia POST /encomendas (2.7185ms)
  ✔ mudarStatusEncomenda envia PATCH /encomendas/:id/status (1.3628ms)
  ✔ finalizarEncomenda envia POST /encomendas/:id/finalizar com a forma (1.2397ms)
  ✔ mensagemErroEncomenda devolve a mensagem do backend (0.8178ms)
  ✔ formulário isola o seletor de produto para não remontar o modal a cada busca (84.0543ms)
  ✔ busca e seleção de produto não zeram o scroll do modal (346.1428ms)
✔ Passo 2 — cadastro (cliente opcional) e itens estilo carrinho (453.0329ms)
ℹ tests 17
ℹ suites 2
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1242.0067
```
