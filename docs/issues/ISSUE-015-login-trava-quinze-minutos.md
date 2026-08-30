# ISSUE-015 — Login trava 15 minutos e não zera quando a senha acerta

- **Status:** Aberta — depois do período de teste (2026-08-30)
- **Data:** 2026-08-30
- **Módulo:** `backend/src/app.js` (`criarLimitadorLogin`)
- **Severidade:** Média no balcão — um digitou errado e o caixa pode ficar sem vender um quarto de hora; neste PC o IP é um só
- **Relacionado:** SPEC-BE-001; SPEC-FE-002; ADR-004; PRD-001 §4.1; conversa com o operador em 2026-08-30

---

## 1. Sintoma

1. Cinco cliques em **Entrar** (certo ou errado) no mesmo PC.
2. O sexto, mesmo com a senha certa, volta *Muitas tentativas. Tente novamente em alguns minutos.*
3. Esperar **15 minutos**. Acertar a senha **não** limpa o contador.

---

## 2. Causa

`express-rate-limit` em `criarLimitadorLogin`: `max: 5`, `windowMs: 15 * 60 * 1000`. Não há `skipSuccessfulRequests` nem reset no login ok. Conta **todo** `POST /api/auth/login` daquele IP. Número e janela vieram do V1 (proteção pensada para rede), não para um único posto na loja.

---

## 3. Correção proposta

Não implementar agora. Congelado até o fim do período de teste da V2 neste PC.

Quando priorizar, o corte combinado na conversa:

- Continuar **5 tentativas**
- Janela de **2 minutos** (não 15)
- **Acertar a senha zera** o contador

Atualizar SPEC-BE-001, SPEC-FE-002 e a menção na ADR-004 / PRD no mesmo PR.

---

## 4. Teste permanente (canário)

Ainda não há caso que afirme a janela de 2 minutos nem o reset no sucesso. Quando fechar esta issue: teste HTTP em `backend/tests/users/` cobrindo 5 falhas → 429, sucesso no meio da janela → contador limpo, e o log bruto do `npm test`.

---

## 5. Critério de aceite para fechar esta issue

- [ ] Período de teste da V2 na loja encerrado e o produto priorizou.
- [ ] 5 erros / 2 min / reset no login ok, no código e nas specs.
- [ ] Canário permanente com log bruto.

---

## 6. Nota de processo

Em 2026-08-30 o operador achou 15 minutos excessivo no balcão e pediu para **não mudar agora** — só anotar e atacar depois do teste. Os 15 minutos **permanecem** até esta issue fechar.
