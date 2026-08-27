# SPEC-FE-018 — Categorias em caixa flutuante na tela de Produtos

- **Status:** Aprovada e implementada (2026-08-26)
- **Data:** 2026-08-26
- **Módulo:** `frontend/src/modules/produtos` (`index.js`, `categorias.js`)
- **Depende de:** SPEC-FE-004 (CRUD de categorias já existe; só muda o *onde* aparece)
- **PRD de origem:** `PRD-005-produtos-e-categorias.md`
- **Não muda:** API de categorias, toggle "Mostrar inativos", modal de produto, regras de desativar/reativar

---

## 0. Por que SPEC e não ISSUE

ISSUE neste repo é regressão/bug (ver `docs/issues/`). Aqui a gestão de categorias continua igual; o operador pediu **outro lugar na tela**: botão ao lado de Novo produto e o painel em overlay, para a lista de produtos não competir com a lista de categorias.

---

## 1. Objetivo

Na tela Produtos, o bloco Categorias **não** fica mais abaixo da tabela. Abre só quando o operador clica **Categoria**.

---

## 2. Passos (cada um testável sozinho)

### Passo 1 — HTML do painel em modo flutuante

`htmlPainelCategorias(..., { comoModal: true })` envolve o mesmo formulário/lista no cromo já usado em produto (`produtos-modal` + `produtos-modal-caixa`): título Categorias, corpo com criar/listar, botão **Fechar**.

Sem `comoModal`, o HTML interno (form + lista + Desativar) permanece o de hoje, para os testes do Passo 2 da SPEC-FE-004.

- **Testável:** HTML com `comoModal` contém `id="modal-categorias"`, `btn-fechar-categorias` e `role="dialog"`. Sem `comoModal`, não contém o overlay.

### Passo 2 — Botão na barra de filtros

Ao lado de `#btn-novo-produto`, botão `#btn-categorias` com o rótulo **Categoria**. A página **não** renderiza o painel até `estado.modalCategorias === true`. Abrir o modal de produto fecha categorias; abrir categorias fecha o de produto.

Fechar: **Fechar**, clique no fundo do overlay, ou sucesso não precisa fechar (criar categoria recarrega a lista **com o modal ainda aberto**).

- **Testável:** fonte de `index.js` tem `btn-categorias` e só chama `htmlPainelCategorias` quando `modalCategorias` está verdadeiro.

---

## 3. Fora de escopo

- Tela/rota própria de categorias
- Mudar contrato de API
- Categorias no PDV (já usa o seletor)

---

## 4. Critérios de aceite

1. Tabela de produtos é a tela principal; categorias não ocupam o rodapé.
2. Botão **Categoria** fica na mesma barra que **Novo produto**.
3. Overlay igual aos outros modais do módulo (escurece o fundo).
4. Criar / desativar / reativar categoria continua funcionando, com o modal aberto.
5. Canários do Passo 1 e 2 verdes.
