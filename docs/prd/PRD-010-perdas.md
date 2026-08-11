# PRD-010 — Perdas (Frontend)

> Módulo com regra de negócio já existente no backend V1 (`routes/perdas.js`), mas **sem tela correspondente** no frontend V1 — confirmado por inspeção do código (nenhuma referência a "perdas" em `index.html` ou `app.js`). É, portanto, tela nova para a V2.

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Registro de quebra/perda de produto
- **Depende de:** PRD-001, PRD-002, PRD-005 (produto), integra com PRD-006 (Estoque)

---

## 1. Objetivo

Dar ao operador uma forma de registrar perda de produto (queimado, vencido, danificado, sobra) com o motivo correto, refletindo imediatamente no saldo de estoque disponível.

---

## 2. Contexto

O backend V1 já possui a rota e a regra (motivo obrigatório por whitelist, custo calculado automaticamente), mas nunca teve interface — o registro provavelmente era feito de outra forma (manual/fora do sistema) ou simplesmente não usado. Como a correção do backend V2 faz a perda debitar o estoque disponível (PRD do backend, Seção 4.10), esta tela passa a ser necessária para que a correção tenha efeito prático.

---

## 3. Requisitos funcionais

- Formulário de registro de perda: produto, quantidade, motivo (queimado, vencido, danificado, sobra — whitelist fixa, sem digitação livre), data.
- Custo da perda exibido automaticamente (produto.custo × quantidade), calculado pelo backend, não editável na tela.
- Listagem de perdas registradas, filtrável por período e por produto, com o motivo e custo de cada uma.
- Feedback imediato do novo saldo de estoque disponível do produto após o registro da perda.

---

## 4. Regras herdadas do V1 (mantidas)

- Motivo restrito à whitelist já validada no backend (queimado, vencido, danificado, sobra).
- Custo não editável manualmente.

---

## 5. Correções em relação ao V1

- Esta tela em si é a correção: sem ela, a regra de backend (perdas existentes) fica sem uso prático. Além disso, a exclusão de um registro de perda deve respeitar a mesma permissão do restante do sistema (o V1 deixava a exclusão de perda sem controle de permissão específico — corrigido no backend, refletido aqui restringindo a ação a quem tem a permissão correta na UI).

---

## 6. Fora de escopo desta fase

- Relatório de perdas por causa/tendência (fica para o módulo de Relatórios, PRD-012, se for priorizado).

---

## 7. Critérios de aceite

1. Registrar uma perda reduz corretamente o saldo disponível do produto exibido na tela de Estoque.
2. Motivo só aceita valores da whitelist.
3. Custo da perda nunca é editável diretamente pelo operador.
4. Exclusão de perda respeita a permissão correta, não fica aberta a qualquer usuário autenticado.
