# ISSUE-011 — Header, login e cupom mostram “S&M Panificadora” em texto em vez da logo

- **Status:** Corrigido (2026-08-30)
- **Data:** 2026-08-30
- **Módulo:** `frontend/index.html` (`.marca`); `frontend/login.html` (`#logo-loja`); `frontend/src/modules/pdv/cupom.js` (`htmlCupomNaoFiscal`); `frontend/assets/logo-horizontal-tela.svg`
- **Severidade:** Baixa no negócio, alta na identidade — o ticket e o topo da loja saíam com nome datilografado; a marca aprovada é a logo horizontal (pão + PANIFICADORA S&M).
- **Relacionado:** SPEC-FE-007 §5; SPEC-FE-015 (marca no header); SPEC-FE-017 (PNG 1-bit / data URI no papel); pedido do operador em 2026-08-30

---

## 1. Sintoma

- No header do PDV e no login, o título era o texto **S&M Panificadora**.
- No cupom não fiscal (prévia e papel), o cabeçalho era de novo o nome em texto, sem a logo do comprovante de caixa.

---

## 2. Causa

O shell e o login usavam copy estático. O cupom montava `<div class="nome-loja">` com `nomeLoja`. A logo 1-bit já existia só no comprovante de fechamento (`logo-cupom-data-uri.js`).

---

## 3. Correção aplicada

- Header: `.marca` passou a ser `<img src="assets/logo-horizontal-tela.svg">` (versão clara no tema escuro). Sem o nome ao lado.
- Login: a mesma SVG visível; `#nome-loja` fica só para leitores de tela (clip). `aplicarIdentidadeVisual` não troca mais o `src` da logo.
- Cupom: cabeçalho é `<img>` com `LOGO_CUPOM_DATA_URI` (mesmo PNG 1-bit do fechamento). Slogan da API continua abaixo. `alt` guarda o nome da loja.

A aba do Chrome pode continuar com o título “S&M Panificadora”.

---

## 4. Teste permanente (canário)

- `frontend/tests/shell.test.js` — “topo e login mostram a logo, sem o nome em texto”
- `frontend/tests/pdv/passo8.test.js` — “html traz número, itens, total e aviso de não fiscal” (exige `data:image/png;base64` e `alt`, e recusa `nome-loja`)

Log bruto (mesmo comando da ISSUE-009, 2026-08-30):

```
cwd: c:\Users\Panificadora S&M\Desktop\PDV_2V\S-M-Panificadora-V2\frontend
command: npm.cmd test -- tests/caixa-turno/passo1.test.js tests/pdv/passo8.test.js tests/impressao.test.js tests/shell.test.js

▶ Passo 8 — cupom não fiscal
  ✔ html traz número, itens, total e aviso de não fiscal (81.5837ms)
✔ Passo 8 — cupom não fiscal (92.2377ms)
▶ shell e guarda de rota
  ✔ topo e login mostram a logo, sem o nome em texto (1.4438ms)
✔ shell e guarda de rota (117.7511ms)
ℹ tests 29
ℹ suites 5
ℹ pass 29
ℹ fail 0
ℹ duration_ms 625.6971
```

(Log completo do mesmo `npm.cmd test` está colado na ISSUE-009, seção 4.)
