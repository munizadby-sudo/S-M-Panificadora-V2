# SPEC-FE-010 — Produção (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-22
- **Módulo:** `frontend/src/modules/producao`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-BE-010 (contrato de API)
- **PRD de origem:** `PRD-007-producao.md`

> Lembrete de contexto: este módulo **nunca existiu no V1** — o campo `produzido` era editado direto na tela de Estoque, sem tela própria. Esta SPEC-FE-010 é o que dá ao padeiro/responsável de produção uma forma de registrar o realizado sem precisar mexer em Estoque diretamente.

---

## 1. Objetivo técnico

Especificar o lançamento de produção pela UI: formulário simples (produto, quantidade, data padrão hoje), responsável sempre implícito (usuário logado), e feedback imediato do novo saldo disponível após o lançamento — mesmo padrão de confirmação já usado em Perdas (SPEC-FE-006, Passo 3).

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/producao/index.js
export default {
  id: 'producao',
  label: 'Produção',
  icone: 'ti-chef-hat',
  permissao: 'producao',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Formulário de lançamento

- Campos: produto (busca/seleção — reaproveitar `SeletorProduto`, já usado em Perdas/SPEC-FE-006), quantidade, data (padrão: hoje, editável para lançamentos retroativos).
- Não existe campo de "responsável" — é sempre o usuário logado, preenchido automaticamente no backend.
- Submeter via `POST /api/producao` (SPEC-BE-010, Seção 5.1).
- **Testável:** lançar uma produção de verdade e ver a confirmação.

### Passo 2 — Feedback do novo saldo após o lançamento

- Depois de um lançamento confirmado, consultar `GET /api/estoque?produto_id=X&data=Y` (SPEC-BE-005, Seção 5.1) para o mesmo produto/data e exibir o **novo saldo disponível** na confirmação — mesmo padrão do Passo 3 de Perdas (SPEC-FE-006).
- **Testável:** lançar uma produção e ver, na mesma tela, o saldo disponível já atualizado, sem precisar navegar até Estoque pra conferir.

### Passo 3 — Listagem de lançamentos (somente leitura)

- Consumir `GET /api/producao` (SPEC-BE-010, Seção 5.2), com filtro por período (data início/fim) e produto.
- Colunas: produto, data, quantidade, usuário responsável.
- **Testável:** ver a listagem carregada de verdade, filtrar por período e por produto.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `FormularioProducao` | Lançamento com produto, quantidade e data |
| `ListaProducao` | Tabela com filtros de período/produto |
| `SeletorProduto` | Reaproveitado de `modules/perdas` (SPEC-FE-006) |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `400` — quantidade ≤ 0 | Mensagem inline no campo |
| `400` — produto inativo | Não deveria ser alcançável (seleção vem de produtos ativos); tratar defensivamente |
| `404` — produto não existe | Não deveria ser alcançável; tratar defensivamente |

---

## 6. Fora de escopo desta SPEC

- Edição ou exclusão de um lançamento já confirmado — não existe no backend (SPEC-BE-010, Seção 6); correção é feita via ajuste manual em Estoque, fora deste módulo.
- Ficha técnica / consumo de insumos.
- Planejamento ou meta de produção.

---

## 7. Critérios de aceite técnicos

1. O responsável pelo lançamento nunca é um campo editável na UI — é sempre implícito (usuário logado).
2. A confirmação de produção lançada mostra o saldo de estoque já atualizado, sem exigir navegação manual.
3. Cada um dos 3 passos da Seção 3 é individualmente testável no navegador, na ordem descrita.
