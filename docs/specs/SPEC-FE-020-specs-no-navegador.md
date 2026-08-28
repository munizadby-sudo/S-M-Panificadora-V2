# SPEC-FE-020 — SPECs no navegador (Chromium)

- **Status:** Aprovada e implementada (2026-08-27)
- **Data:** 2026-08-27
- **Módulo:** `demo/` (`testar-specs.mjs`, `specs/navegador.test.js`)
- **Depende de:** SPEC-FE-002, SPEC-FE-003, SPEC-FE-007 (os passos “Como testar (navegador)” dessas specs); reusa o Chromium do Playwright já baixado para o vídeo demo
- **PRD de origem:** nenhum — pedido do operador: o Chrome da demo deve **conferir** as specs, não só gravar o tour
- **Não muda:** regras de negócio, telas, API, `npm test` do frontend/backend, `npm run gravar`

---

## 0. Por que SPEC e não ISSUE

ISSUE neste repo é regressão/bug. Aqui não há sintoma: o Chromium em `demo/pw-browsers/` existia só para filmar o PDV. A suíte nova usa o mesmo navegador para **reprovar** se login, caixa ou venda deixarem de cumprir o que já estava escrito nas specs.

---

## 1. Objetivo

O operador (e o Cursor) param de clicar na mão os passos “Como testar (navegador)” das specs cobertas. Um comando sobe um PDV de teste, o Chromium clica, e o resultado é verde ou vermelho.

O caixa e as vendas da padaria **não** entram nisso. Banco e API desta suíte são em memória, descartados no fim.

---

## 2. Como rodar

Na pasta `demo/`:

```
npm run testar
```

Equivale a `node testar-specs.mjs`. Precisa do Playwright em `demo/node_modules` e do Chromium em `demo/pw-browsers/` (já gitignorado; se faltar: `npx playwright install chromium` com `PLAYWRIGHT_BROWSERS_PATH` apontando para `demo/pw-browsers`).

Verde = os 12 casos da Seção 4 passaram. Vermelho = alguma tela da spec coberta quebrou.

O tour em vídeo continua separado: `npm run gravar`.

---

## 3. Arquivos

| Arquivo | Papel |
|---|---|
| `demo/testar-specs.mjs` | Sobe API em memória (`montarAppMemoria`) + front estático em portas livres; semeia admin, operador, pão e estoque; roda os testes |
| `demo/specs/navegador.test.js` | Casos Playwright alinhados aos passos das specs |
| `demo/specs/harness.mjs` | Login, sessão (`sm.panificadora.*`), abrir turno |
| `frontend/src/core/ambiente.js` | Se existir `globalThis.__SM_API_BASE`, a página usa essa API (porta efêmera). Sem isso, continua 4173 → 3001 |
| `frontend/tests/ambiente.test.js` | Canário da injeção `__SM_API_BASE` |

Contas só nesta suíte: `admin` / `admin123` e `maria` / `maria123`. Não são as da loja.

---

## 4. O que está coberto hoje

Ordem fixa (o caixa aberto no meio da suíte é o mesmo processo em memória):

| Spec | Passos da spec | O que o Chromium confirma |
|---|---|---|
| SPEC-FE-002 | 2, 3, 4, 5, 6, 7, 8 | Senha errada sem token; login admin mostra `Administrador (admin)`; GET `/configuracoes/publico` sem `Authorization`; logado não vê o formulário de novo; Sair limpa storage e a guarda devolve ao login; operador mostra `Maria Silva (operador)`; token morto volta ao login |
| SPEC-FE-007 | 1 (caixa fechado) | Tela Vendas com `#aviso-caixa-fechado`, sem `.pdv-produto` |
| SPEC-FE-003 | 1, 2 | Banner `Caixa fechado` → abrir turno → `Caixa aberto` |
| SPEC-FE-007 | 2, 3 | Grade, item no carrinho, dinheiro, `Venda confirmada` |

Fora deste corte (continuam só no `npm test` de cada módulo, ou no clique na loja): encomendas, estoque, perdas, produção, fluxo, relatórios, funcionários, fechamento completo do caixa, atalhos F1–F10, cupom impresso.

---

## 5. Regras

1. Não apontar esta suíte para o MySQL da padaria. `montarAppMemoria` é obrigatório.
2. Não misturar `testar` e `gravar` no mesmo script — um afirma, o outro filma.
3. Ampliar cobertura = novo `test()` em `navegador.test.js` mapeado a um passo de spec já existente, não um terceiro runner.
4. `pw-browsers/` e `node_modules/` da `demo/` não entram no Git.

---

## 6. Critérios de aceite

1. `cd demo && npm run testar` termina com os casos verdes (incluindo SPEC-FE-015 layout estreito em 390px) sem o frontend 4173 nem o backend 3001 da loja no ar.
2. Uma venda desta suíte não aparece no fluxo de caixa real.
3. `npm run gravar` continua gravando o MP4 como antes.
4. Sem `__SM_API_BASE`, `obterUrlBaseDaApi` em 127.0.0.1:4173 continua `http://127.0.0.1:3001/api`.
