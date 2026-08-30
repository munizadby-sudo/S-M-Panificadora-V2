# ISSUE-010 — Finalizar venda abre aba do Chrome e a tela de impressão do navegador

- **Status:** Corrigido (2026-08-30) — o diálogo nativo some só no Chrome do PDV (`abrir-pdv.bat`)
- **Data:** 2026-08-30
- **Módulo:** `frontend/src/core/impressao.js` (`imprimirHtmlEmIframe`); `frontend/src/modules/pdv` (`cupom.js`, `modal-impressao.js`); `abrir-pdv.bat`
- **Severidade:** Alta no balcão — cada venda tirava o operador da tela de Vendas para uma aba/`about:blank` e depois para o diálogo **Destino / Imprimir** do Chrome.
- **Relacionado:** SPEC-FE-007 §5; SPEC-FE-017 (mesmo `print()`, sem ESC/POS); ISSUE-001 (noopener / aba vazia); EPSON TM-T20X na loja; relato do operador em 2026-08-30

---

## 1. Sintoma

1. Confirmar a venda no PDV.
2. O Chrome abre **outra aba** com o cupom e dispara `print()`.
3. Depois do box flutuante **Imprimir cupom**, clicar **Imprimir** ainda abre a tela nativa do Chrome (prévia + destino EPSON TM-T20X).

O operador quer: finalizei → o papel sai. Sem aba e, no caixa, sem a tela do Chrome.

---

## 2. Causa

`imprimirCupomHtml` / `imprimirHtml` usavam `window.open('', '_blank')` + `document.write` + `janela.print()`. Isso **é** uma aba.

A tela **Imprimir** do Chrome não é um bug do PDV: página web **não** pode silenciar `print()` por segurança. Só some se o Chrome nascer com `--kiosk-printing` e a térmica for a impressora padrão do Windows.

---

## 3. Correção aplicada

1. `frontend/src/core/impressao.js` — `imprimirHtmlEmIframe`: iframe fora da tela (80 mm), escreve o HTML, `print()`, remove o iframe. Sem `window.open`. Cupom e fechamento de caixa passam por aí.
2. `modal-impressao.js` — após a venda, box **Imprimir cupom** com prévia, **Imprimir** e **Fechar**. A venda já está gravada. Impressão só no botão (ou Enter). Sucesso fecha o box.
3. `abrir-pdv.bat` — abre um Chrome **só do PDV** (`--kiosk-printing`, `--user-data-dir` separado, `--app=http://127.0.0.1:4173/index.html`). Nesse perfil, **Imprimir** manda direto para a impressora padrão (EPSON TM-T20X). O Chrome normal (WhatsApp, suporte) continua com o diálogo.

---

## 4. Teste permanente (canário)

- `frontend/tests/impressao.test.js` — “cupom e fechamento usam iframe oculto, não window.open”
- `frontend/tests/pdv/passo8.test.js` — “venda abre box flutuante e só imprime no botão Imprimir”
- `frontend/tests/pdv/passo8.test.js` — “imprimirCupomHtml imprime no iframe sem abrir aba”
- `frontend/tests/caixa-turno/passo3-4.test.js` — “imprimirHtml escreve no iframe oculto e dispara print”

`--kiosk-printing` é do Chrome/Windows, não da suíte Node. Conferência na loja: atalho + EPSON padrão + uma venda.

Log bruto (mesmo comando da ISSUE-009, 2026-08-30):

```
cwd: c:\Users\Panificadora S&M\Desktop\PDV_2V\S-M-Panificadora-V2\frontend
command: npm.cmd test -- tests/caixa-turno/passo1.test.js tests/pdv/passo8.test.js tests/impressao.test.js tests/shell.test.js

▶ impressão sem aba do Chrome
  ✔ cupom e fechamento usam iframe oculto, não window.open (7.1862ms)
  ✔ escreve o HTML, chama print e remove o iframe (4.2794ms)
✔ impressão sem aba do Chrome (15.3493ms)
▶ Passo 8 — cupom não fiscal
  ✔ html traz número, itens, total e aviso de não fiscal (81.5837ms)
  ✔ dinheiro inclui recebido e troco (2.6076ms)
  ✔ venda abre box flutuante e só imprime no botão Imprimir (5.2698ms)
  ✔ imprimirCupomHtml imprime no iframe sem abrir aba (1.8123ms)
✔ Passo 8 — cupom não fiscal (92.2377ms)
ℹ tests 29
ℹ suites 5
ℹ pass 29
ℹ fail 0
ℹ duration_ms 625.6971
```

(Log completo do mesmo `npm.cmd test` está colado na ISSUE-009, seção 4.)

---

## 5. Como operar na loja

1. Windows: EPSON TM-T20X como impressora **padrão**.
2. Subir API (`3001`) e frontend (`4173`).
3. Dois cliques em `abrir-pdv.bat` (não usar a aba comum do Chrome para vender).
4. Entrar de novo nesse Chrome (perfil separado) e vender.
