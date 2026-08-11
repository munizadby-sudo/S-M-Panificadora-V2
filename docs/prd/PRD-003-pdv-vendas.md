# PRD-003 — PDV / Vendas (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Tela de venda no balcão (carrinho, formas de pagamento)
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-caixa` em `index.html`, funções `renderGrid`, `addItem`, `delItem`, `removerUltimoItem`, `limpar`, `setPgto`, `cicloPagamento`, `atualizarTroco`, `renderItens`, `abrirCupomNaoFiscal` em `app.js`
- **Depende de:** PRD-001, PRD-002, PRD-004 (Caixa por Turno — venda exige turno aberto)

---

## 1. Objetivo

Permitir que o operador registre uma venda no balcão de forma rápida: selecionar produtos, montar o carrinho, escolher forma de pagamento e confirmar — sem travar em erro técnico e sem permitir venda sem turno de caixa aberto.

---

## 2. Contexto (V1)

- Grade de produtos (`grid`) com busca (`busca`) e seleção por categoria.
- Carrinho (`itens`) com adição/remoção de item, remoção do último item, botão de limpar.
- Seleção de forma de pagamento (`btn-dinheiro`, `btn-pix`, `btn-cartao`, `btn-credito`), com cálculo de troco quando em dinheiro.
- Atalhos de teclado (`initAtalhosTeclado`) para agilizar o atendimento no balcão.
- Emissão de cupom não fiscal ao final da venda (`abrirCupomNaoFiscal`).
- Banner de status do turno de caixa (`caixa-turno-banner`) visível nesta mesma tela.

---

## 3. Requisitos funcionais

- Grade de produtos com busca rápida e navegação por categoria.
- Carrinho com quantidade por item, remoção individual e limpeza total.
- Seleção de forma de pagamento antes de confirmar a venda; cálculo automático de troco quando pagamento em dinheiro.
- Confirmar venda só é permitido com: carrinho não vazio, total maior que zero, e turno de caixa aberto — se não houver turno aberto, a tela deve bloquear a confirmação com mensagem clara, não deixar o operador tentar e receber erro do backend sem contexto.
- Exibir, de forma visível durante toda a tela, o status do turno atual (aberto/fechado, período).
- Ao confirmar a venda com sucesso, limpar o carrinho e emitir o cupom não fiscal.
- Item cuja disponibilidade em estoque for insuficiente deve ser sinalizado antes da tentativa de confirmação, quando possível (feedback antecipado), sem impedir totalmente a tentativa (a validação definitiva é sempre do backend).

---

## 4. Regras herdadas do V1 (mantidas)

- Atalhos de teclado para agilizar o atendimento.
- Cálculo automático de troco.
- Cupom não fiscal ao final da venda.
- Bloqueio de venda sem turno aberto, refletido na interface (não apenas no backend).

---

## 5. Correções em relação ao V1

- A mensagem de bloqueio por "caixa fechado" deve ser clara e específica na tela de venda (código `CAIXA_FECHADO` do backend traduzido para uma mensagem de negócio compreensível), nunca um erro genérico.
- Erro de estoque insuficiente vindo do backend deve aparecer como mensagem de negócio ("produto sem estoque suficiente"), nunca como erro técnico — consequência direta da correção do bug do backend (PRD do backend, Seção 4.6).

---

## 6. Fora de escopo desta fase

- Pagamento via TEF integrado (depende do contrato de integração TEF do backend, ainda não implementado concretamente).
- Emissão de cupom fiscal (depende da integração fiscal do backend).
- Venda com desconto/promoção — não existe no V1 e não está confirmado como necessidade atual.

---

## 7. Critérios de aceite

1. Não é possível confirmar venda sem turno de caixa aberto; a interface impede a tentativa com mensagem clara.
2. Total e troco calculados corretamente para pagamento em dinheiro.
3. Erros de estoque retornados pelo backend aparecem como mensagem de negócio compreensível.
4. Carrinho limpa corretamente após venda confirmada.
5. Atalhos de teclado essenciais do V1 continuam funcionando (adicionar item, remover último, limpar, confirmar).
