# PRD-007 — Produção (Frontend)

> Módulo novo em relação ao V1 — não existe tela equivalente no legado. Corresponde ao módulo "Produção" já previsto na ADR-001 e detalhado no PRD do backend (Seção 4.5).

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Registro de produção diária por produto
- **Depende de:** PRD-001, PRD-002, PRD-005 (produto), integra com PRD-006 (Estoque)

---

## 1. Objetivo

Dar ao padeiro/responsável pela produção uma forma simples de registrar quanto foi produzido de cada item no dia, alimentando o campo `produzido` do estoque de forma rastreável — sem precisar editar o estoque diretamente.

---

## 2. Contexto

No V1, o campo `produzido` do estoque existe, mas é editado diretamente na tela de Estoque, sem registro de quem produziu, quando, ou em qual lote/lançamento. Isso funciona, mas não deixa rastro de produção como evento próprio.

---

## 3. Requisitos funcionais

- Tela/formulário para lançar produção: produto, quantidade, data (padrão: hoje), responsável (usuário logado, automático).
- Listagem de lançamentos de produção do dia, com possibilidade de consulta por produto/período.
- Ao confirmar um lançamento de produção, o `produzido` do estoque do dia correspondente é incrementado automaticamente (o cálculo em si é responsabilidade do backend; a UI apenas envia o lançamento e reflete o resultado).
- Feedback imediato do novo saldo `disponível` do produto após o lançamento.

---

## 4. Regras herdadas do V1 (mantidas)

- Nenhuma diretamente — módulo novo. A única continuidade é o efeito final esperado: o `produzido` do estoque deve refletir a produção lançada, mantendo a fórmula `disponível = inicial + produzido − vendido` já validada no V1.

---

## 5. Correções em relação ao V1

- Diferente do V1 (edição direta do campo `produzido` na tela de Estoque, sem rastro), a V2 registra produção como evento próprio, rastreável por usuário e horário — consequência direta do requisito de auditoria completa do backend V2 (PRD do backend, Seção 4.14).

---

## 6. Fora de escopo desta fase

- Ficha técnica com consumo de insumos por receita — este módulo lança apenas a quantidade produzida do item final, não controla matéria-prima consumida.
- Planejamento/meta de produção (quanto deveria ser produzido) — cobre apenas o registro do realizado.

---

## 7. Critérios de aceite

1. Um lançamento de produção sempre resulta no incremento correto do `produzido` do estoque do dia.
2. Todo lançamento fica associado ao usuário responsável e ao horário.
3. É possível consultar o histórico de produção por produto e por período.
