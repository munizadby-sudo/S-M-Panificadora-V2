# SPEC-FE-005 — Estoque (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `frontend/src/modules/estoque`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-FE-004 (`SeletorCategoria`, reaproveitado aqui), SPEC-BE-005 (contrato de API que este módulo consome)
- **PRD de origem:** `PRD-006-estoque.md`

---

## 1. Objetivo técnico

Especificar a implementação do módulo de Estoque: listagem do dia com rollover já aplicado pelo backend, alerta visual de abaixo do mínimo, e edição individual/em lote — sempre deixando claro que `vendido` nunca é editável diretamente.

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/estoque/index.js
export default {
  id: 'estoque',
  label: 'Estoque',
  icone: 'ti-boxes',
  permissao: 'estoque',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Listagem do estoque do dia (somente leitura)
- Consumir `GET /api/estoque` (SPEC-BE-005, Seção 5.1), data padrão = hoje.
- Colunas: produto, inicial, produzido, vendido, **disponível** (destacado), mínimo.
- Linha com `abaixo_do_minimo: true` (vindo pronto do backend) recebe destaque visual (ex.: fundo amarelo/laranja) — a UI não recalcula essa regra, só reflete o que o backend já decidiu.
- **Testável:** ver a lista carregada de verdade, com o saldo já refletindo o rollover automático do backend (sem nenhuma ação manual precisar acontecer pro saldo "aparecer").

### Passo 2 — Busca e filtro
- Busca por nome de produto e filtro por categoria, reaproveitando o `SeletorCategoria` já construído em `modules/produtos` (SPEC-FE-004) — não duplicar esse componente.
- **Testável:** buscar um produto pelo nome e filtrar por categoria, vendo a lista atualizar.

### Passo 3 — Edição individual
- Ação de editar abre um formulário/modal com `inicial`, `produzido`, `minimo` editáveis.
- **`vendido` e `disponível` são sempre somente leitura nesta tela** — nunca aparecem como campo editável, em nenhuma circunstância (reflete a regra de domínio da SPEC-BE-005, Seção 2.1: `vendido` só muda via venda/perda/correção, nunca edição manual).
- Submeter via `PUT /api/estoque/:produtoId` (SPEC-BE-005, Seção 5.2).
- **Testável:** editar o `inicial`/`produzido` de um produto e ver o `disponível` recalculado corretamente após salvar.

### Passo 4 — Lançamento em lote
- Tabela editável inline (várias linhas de produtos ao mesmo tempo), permitindo ajustar `inicial`/`produzido`/`minimo` de vários produtos antes de salvar tudo de uma vez.
- Submeter via `POST /api/estoque/lote` (SPEC-BE-005, Seção 5.3).
- Se o backend rejeitar por um item inválido no meio do lote (tudo ou nada), a UI deve indicar **qual item especificamente** causou a rejeição, sem perder os valores já digitados nas outras linhas.
- **Testável:** editar 3 produtos de uma vez e salvar em lote; depois, forçar um erro num item (ex.: valor negativo) e confirmar que nenhum dos 3 foi salvo, com a linha problemática identificada.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `ListaEstoque` | Tabela do dia com destaque de abaixo do mínimo |
| `SeletorCategoria` | Reaproveitado de `modules/produtos` (SPEC-FE-004) |
| `ModalEdicaoEstoque` | Edição individual (Passo 3) |
| `TabelaLoteEstoque` | Edição em lote (Passo 4) |

---

## 5. Fora de escopo desta SPEC

- **Ação de "zerar" um período/dia** — mencionada como possibilidade no PRD-006, mas a `SPEC-BE-005` não define esse caso de uso. Se essa necessidade for confirmada como real, precisa de uma SPEC própria (backend + frontend), com a mesma exigência do PRD-006 de confirmação explícita antes de executar — nunca ação de um clique só.
- Consulta de estoque histórico (dias anteriores) — fica para o módulo de Relatórios.

---

## 6. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `400` — valor negativo | Mensagem inline no campo, sem fechar o modal/perder os outros valores |
| `400` — produto inativo | Não deveria ser alcançável (lista só traz produtos ativos por padrão), tratar defensivamente |
| Lote com item inválido | Identifica a linha específica, mantém os valores digitados nas demais |

---

## 7. Critérios de aceite técnicos

1. `vendido` e `disponível` nunca aparecem como campo editável em nenhuma tela deste módulo.
2. O destaque de "abaixo do mínimo" vem sempre do backend (`abaixo_do_minimo`), nunca recalculado no frontend.
3. Lançamento em lote com um item inválido não aplica nenhum item, e a UI aponta exatamente qual falhou.
4. `SeletorCategoria` é o mesmo componente do módulo de Produtos, sem duplicação de código.
5. Cada um dos 4 passos da Seção 3 é individualmente testável no navegador, na ordem descrita.
