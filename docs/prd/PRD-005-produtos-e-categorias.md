# PRD-005 — Produtos e Categorias (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Cadastro, edição e exclusão de produtos e categorias
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-produtos` em `index.html` (`modal-prod`, `p-nome`, `p-cat`, `p-preco`, `p-custo`, `p-icone`, `nova-cat`, `cats`, `prod-body`, `busca-cad`), funções `abrirModalProd`, `renderTabProd`, `renderCats`, `renderCatSelects` em `app.js`
- **Depende de:** PRD-001, PRD-002

---

## 1. Objetivo

Permitir manter o catálogo de produtos e categorias atualizado — cadastro, edição de preço/custo, ativação/desativação — sem afetar histórico de vendas e estoque já lançado.

---

## 2. Contexto (V1)

- Tela lista produtos em tabela (`prod-body`) com busca (`busca-cad`).
- Modal de cadastro/edição (`modal-prod`) com nome, categoria, preço, custo e ícone (emoji).
- Gestão de categorias na mesma tela (`nova-cat`, `cats`), com seletor de categoria reaproveitado em outras telas (`renderCatSelects`).
- Exclusão é sempre soft delete no backend (produto/categoria continuam existindo para preservar histórico).

---

## 3. Requisitos funcionais

- Listagem de produtos com busca por nome/categoria.
- Cadastro e edição de produto: nome, categoria, preço de venda, custo, ícone/identificador visual.
- Cadastro de categoria simples (nome).
- Ação de "excluir" produto/categoria deve ser tratada na UI como **desativar**, não como apagar — refletindo o soft delete do backend; produto/categoria desativado não aparece mais em telas de venda, mas continua visível em relatórios/histórico.
- Validação de campos obrigatórios (nome, categoria, preço) antes de enviar ao backend.
- Feedback claro quando o backend rejeitar por nome duplicado (nova regra do backend V2, PRD do backend Seção 4.3).

---

## 4. Regras herdadas do V1 (mantidas)

- Cadastro simples e rápido de produto com ícone visual (emoji).
- Categoria como campo obrigatório do produto.
- Reaproveitamento do seletor de categoria em outras telas do sistema.

---

## 5. Correções em relação ao V1

- **Aviso de nome duplicado:** o V1 permitia duplicatas silenciosamente; a UI da V2 deve comunicar claramente quando o backend rejeitar por duplicidade (a decisão de permitir ou não fica a critério da regra de backend, mas a UI não pode falhar silenciosamente).
- Nenhuma chamada de depuração/log de payload completo deve permanecer no console em produção (o V1 tinha logs de debug ativos nesta tela).

---

## 6. Fora de escopo desta fase

- Upload de imagem real de produto (o padrão atual usa ícone/emoji, não foto) — mudança de mídia fica para decisão futura.
- Precificação por variação (tamanho, sabor) — produto é uma entidade simples nesta fase.

---

## 7. Critérios de aceite

1. Produto/categoria "excluído" na UI continua existindo no histórico de vendas e estoque anteriores.
2. Cadastro exige nome, categoria e preço antes de permitir salvar.
3. Erro de nome duplicado retornado pelo backend aparece como mensagem clara na tela.
4. Seletor de categoria usado em outras telas (venda, estoque) reflete corretamente o cadastro atual.
