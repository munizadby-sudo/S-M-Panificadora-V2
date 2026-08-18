# SPEC-FE-004 — Produtos e Categorias (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `frontend/src/modules/produtos`
- **Depende de:** SPEC-FE-001 (Fundação — `core/api.js`, `session.js`, `router.js`), SPEC-BE-004 (contrato de API que este módulo consome)
- **PRD de origem:** `PRD-005-produtos-e-categorias.md`

---

## 1. Objetivo técnico

Especificar a implementação do módulo de Produtos e Categorias no frontend: listagem com busca, cadastro/edição com feedback de erro claro (principalmente nome duplicado por categoria), e tratamento visual de soft delete como "desativar".

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/produtos/index.js
export default {
  id: 'produtos',
  label: 'Produtos',
  icone: 'ti-bread',
  permissao: 'produtos',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Listagem de produtos (somente leitura)
- Consumir `GET /api/produtos` (SPEC-BE-004, Seção 5.1), com busca por nome e filtro por categoria.
- **Alternância "Mostrar inativos"**, implementada como **toggle** (pista cinza desligado, verde ligado — não checkbox), padrão desligado: quando ligada, traz também os produtos desativados. Sem essa alternância, não existe nenhum caminho na UI para encontrar um produto desativado por engano (gap corrigido via ISSUE-005, 2026-08-17).
- **Diferenciação visual por status:** linha de produto ativo com fundo verde claro; linha de produto inativo com fundo vermelho claro. Mesma convenção aplicada à listagem de categorias (Passo 2).
- Renderizar tabela/lista com nome, categoria, preço, custo, ícone.
- **Testável:** ver a lista de produtos carregada de verdade do backend, buscar por nome, ver o filtro de categoria funcionar, e ver a alternância "Mostrar inativos" trazer produtos desativados.

### Passo 2 — CRUD de categorias
- Formulário simples de criar categoria (`POST /api/categorias`).
- Listagem de categorias para popular o seletor usado no cadastro de produto (Passo 3).
- Ação de desativar categoria tratada como "desativar", nunca "excluir" no texto da UI.
- **Testável:** criar uma categoria nova e ver ela aparecer disponível para uso.

### Passo 3 — Cadastro e edição de produto
- Modal com nome, categoria (seletor populado pelo Passo 2), preço, custo, ícone.
- Validação de campos obrigatórios no frontend antes de enviar (nome, categoria, preço > 0) — feedback imediato, sem depender só do backend.
- Tratamento do erro `409` (nome duplicado na categoria) como mensagem de negócio clara no modal, sem fechar o modal — texto sugerido: *"Já existe um produto com esse nome nessa categoria."*
- **Testável:** cadastrar um produto novo, editar um existente, e tentar cadastrar um nome duplicado na mesma categoria vendo a mensagem de erro aparecer.

### Passo 4 — Desativação e reativação de produto
- Ação de "excluir" na UI chama `DELETE /api/produtos/:id` (soft delete) e é rotulada como "Desativar", nunca "Excluir".
- Produto desativado sai da listagem padrão (filtro `ativo=1` implícito), mas continua existindo e aparece quando "Mostrar inativos" (Passo 1) está ativado.
- Produto desativado, visível com "Mostrar inativos" ligado, exibe um botão **"Reativar"** (`POST /api/produtos/:id/reativar`, SPEC-BE-004, Seção 5.4.1). Se a reativação falhar com 409 (outro produto ativo já ocupa esse nome na categoria), exibir a mesma mensagem de negócio do Passo 3.
- **Testável:** desativar um produto, confirmar que ele some da lista padrão, ligar "Mostrar inativos" e vê-lo reaparecer, clicar em "Reativar" e vê-lo voltar a aparecer na lista padrão.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `ListaProdutos` | Tabela com busca e filtro por categoria |
| `SeletorCategoria` | Dropdown reaproveitável (também usado futuramente em Estoque, PDV) |
| `ModalProduto` | Formulário de cadastro/edição com validação e feedback de erro |
| `ModalCategoria` | Formulário simples de criar categoria |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `400` — preço ≤ 0, custo negativo, nome vazio | Mensagem inline no campo correspondente, sem fechar o modal |
| `404` — categoria não existe | Não deveria ser alcançável (seletor só lista categorias reais), mas tratar defensivamente |
| `409` — nome duplicado na categoria | Mensagem de negócio clara (Passo 3), sem fechar o modal |

---

## 6. Critérios de aceite técnicos

1. Nenhuma chamada `fetch()` direta neste módulo — tudo via `core/api.js`.
2. Erro 409 nunca aparece como mensagem técnica genérica — sempre a mensagem de negócio específica de nome duplicado.
3. "Desativar" nunca aparece como "Excluir" em nenhum texto de botão ou confirmação.
4. `SeletorCategoria` é um componente isolado, reaproveitável por outros módulos futuros sem duplicar código.
5. Cada um dos 4 passos da Seção 3 é individualmente testável no navegador, na ordem descrita.
