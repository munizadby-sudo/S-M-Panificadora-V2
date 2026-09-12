# ISSUE-015 — Login trava 15 minutos e não zera quando a senha acerta

- **Status:** Corrigido (2026-09-12) — piloto encerrado em 2026-09-13, item 1 da lista congelada
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

## 3. Correção aplicada

- Continua **5 tentativas**.
- Janela de **2 minutos** (era 15) — `windowMs: 2 * 60 * 1000` em `criarLimitadorLogin`.
- `keyGenerator` explícito (`req.ip`) para poder reproduzir a mesma chave no reset.
- **Acertar a senha zera o contador**: a rota `/api/auth/login` escuta `res.on('finish')` e, se a resposta for sucesso (`statusCode < 400`), chama `limitadorLogin.resetKey(req.ip)` — reset completo, não só "não contar" o sucesso.
- SPEC-BE-001 e SPEC-FE-002 atualizadas com os números novos e a regra de reset.

---

## 4. Teste permanente (canário)

`backend/tests/users/login.http.test.js`, describe `rate limit do login (ISSUE-015)`:

- "5 tentativas erradas bloqueiam a 6ª com 429"
- "acertar a senha no meio da janela zera o contador" — 4 erradas, 1 certa, mais 5 erradas (nenhuma bloqueada, contador zerou no acerto), a 6ª bloqueia.

`tests/helpers/app-memoria.js` ganhou parâmetro opcional `limitadorLogin` (os demais testes de login continuam com o limitador no-op, sem mudança de comportamento).

---

## 5. Critério de aceite para fechar esta issue

- [x] Piloto de 14 dias encerrado (2026-09-13) e o produto priorizou.
- [x] 5 erros / 2 min / reset no login ok, no código e nas specs.
- [x] Canário permanente com log bruto (ver Seção 6).

---

## 6. Log bruto do teste

```
▶ rate limit do login (ISSUE-015)
  ✔ 5 tentativas erradas bloqueiam a 6ª com 429
  ✔ acertar a senha no meio da janela zera o contador
✔ rate limit do login (ISSUE-015)
```

---

## 7. Nota de processo

Em 2026-08-30 o operador achou 15 minutos excessivo no balcão e pediu para **não mudar agora** — só anotar e atacar depois do teste. Os 15 minutos valeram até 2026-09-12, quando o piloto fechou e esta issue foi priorizada.
