# PRD-011 — Clientes (Frontend)

> Módulo novo em relação ao V1, que não tinha cadastro de cliente próprio — os dados de cliente (nome, telefone) ficavam embutidos informalmente dentro do formulário de Encomendas. Previsto na ADR-001 como módulo próprio ("clientes").

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Cadastro mínimo de clientes
- **Depende de:** PRD-001, PRD-002. Integra com PRD-008 (Encomendas).

---

## 1. Objetivo

Manter um cadastro simples e reaproveitável de clientes, para vincular a encomendas sem precisar redigitar nome/telefone toda vez, abrindo caminho para histórico de pedidos por cliente no futuro.

---

## 2. Contexto

No V1, cada encomenda guardava nome e telefone do cliente digitados no próprio formulário, sem cadastro central — não há como, hoje, ver todas as encomendas de um mesmo cliente de forma confiável (nome pode ser digitado de formas diferentes a cada pedido).

---

## 3. Requisitos funcionais

- Listagem de clientes com busca por nome/telefone.
- Cadastro/edição: nome, telefone/WhatsApp (mínimo obrigatório).
- Ação de "excluir" cliente tratada como desativação (soft delete), preservando o vínculo histórico com encomendas já feitas.
- No formulário de Encomendas (PRD-008), campo de busca/seleção de cliente já cadastrado, com opção de cadastrar um novo cliente sem sair da tela de encomenda (fluxo rápido).

---

## 4. Regras herdadas do V1 (mantidas)

- Nenhuma diretamente — módulo novo. Mantém a simplicidade do fluxo de encomenda do V1 (não deve tornar o cadastro de cliente um passo obrigatório e burocrático antes de registrar um pedido simples).

---

## 5. Correções em relação ao V1

- Substitui o padrão de digitar nome/telefone soltos em cada encomenda por um cadastro central reaproveitável, sem remover a agilidade de cadastrar um cliente novo na hora, durante o fluxo de encomenda.

---

## 6. Fora de escopo desta fase

- Programa de fidelidade, crédito de cliente, histórico de consumo agregado (mesmo escopo excluído no PRD do backend, Seção 4.11).
- Vínculo de cliente a vendas de balcão avulsas (PDV) — nesta fase, cliente só se vincula a encomendas.

---

## 7. Critérios de aceite

1. É possível cadastrar um cliente novo sem sair do fluxo de criação de encomenda.
2. Cliente "excluído" continua vinculado ao histórico de encomendas já feitas.
3. Busca de cliente por nome/telefone retorna resultados corretos ao vincular a uma encomenda.
