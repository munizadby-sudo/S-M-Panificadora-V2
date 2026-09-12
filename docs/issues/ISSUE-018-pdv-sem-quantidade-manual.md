# ISSUE-018 — PDV só incrementava item de 1 em 1, sem quantidade manual

- **Status:** Corrigido (2026-09-12)
- **Data:** 2026-09-12
- **Módulo:** `frontend/src/modules/pdv` (`carrinho.js` → `definirQuantidadeNoCarrinho`/`htmlCarrinho`, `index.js` → listener de `[data-quantidade-item]`)
- **Severidade:** Média no balcão — vender quantidade grande do mesmo produto (ex.: 12 pães) exigia repetir a mesma ação 12 vezes; não bloqueava a venda, só era lento e chato
- **Relacionado:** SPEC-FE-007 §2.1 e Passo 2 (atualizadas); item 8 de `docs/depois-do-teste.md`

---

## 1. Sintoma

1. Na tela **Vendas**, a única forma de colocar mais de uma unidade de um produto no carrinho era clicar no card (ou apertar Enter com o card focado) várias vezes seguidas.
2. Cada clique/Enter incrementava a quantidade em **1**. Não havia campo para digitar a quantidade direto.

---

## 2. Causa

`carrinho.js` só expunha `adicionarAoCarrinho` (sempre +1), `removerUltimoDoCarrinho` (sempre -1) e `removerDoCarrinho` (remove a linha inteira). Não existia nenhuma função nem elemento de UI para definir uma quantidade exata numa linha já existente do carrinho — `htmlCarrinho` renderizava a quantidade como texto fixo (`Nome × quantidade`), não como campo editável.

---

## 3. Correção aplicada

- Nova função `definirQuantidadeNoCarrinho(itens, produtoId, quantidade)` (`carrinho.js`) — substitui a quantidade da linha e recalcula o subtotal. Quantidade zero, vazia ou negativa **remove** a linha (mesma regra que `removerUltimoDoCarrinho` já usava ao chegar a zero).
- `htmlCarrinho` troca o texto fixo por `<input type="number" data-quantidade-item="ID" value="quantidade">` em cada linha, mantendo nome e subtotal ao lado.
- `index.js` ouve o evento **`change`** (não `input`) do campo — só recalcula e re-renderiza quando o operador sai do campo ou aperta Enter (que só dá `blur()`, via `evento.preventDefault()`), nunca a cada tecla digitada. Evita re-renderizar o carrinho inteiro no meio da digitação.
- Nenhuma mudança foi necessária no guard de atalhos: `deveRoubarTeclaDeEdicao` (`atalhos.js`) já verifica a tag do elemento focado de forma genérica, então `Delete` (remover último) e as setas de navegação da grade já não disparam sozinhas com o foco no novo campo — mesmo guard que já protegia `#pdv-busca`.
- CSS mínimo em `frontend/index.html`: nome do produto com reticências se for longo, campo de quantidade compacto.

---

## 4. Teste permanente (canário)

`frontend/tests/pdv/quantidade-manual.test.js` (novo) + `frontend/tests/pdv/passo2.test.js` (ajustado — a asserção antiga checava o texto fixo "Nome × 2", que não existe mais):

```
▶ Passo 2 — grade de produtos e carrinho local
  ✔ grade lista produtos ativos com busca e filtro de categoria (79.4984ms)
  ✔ total local soma os subtotais só para exibição (3.5474ms)
  ✔ remover item e remover último recalculam o total (1.2771ms)
  ✔ limpar esvazia o carrinho (3.7551ms)
✔ Passo 2 — grade de produtos e carrinho local (92.7513ms)
▶ Quantidade manual no item (item 8, docs/depois-do-teste.md)
  ✔ definirQuantidadeNoCarrinho troca a quantidade direto, sem clicar N vezes (3.147ms)
  ✔ quantidade zero ou vazia remove o item, igual ao remover último em 1 (0.4852ms)
  ✔ quantidade negativa também remove (nunca fica negativa no carrinho) (0.4175ms)
  ✔ produto que não está no carrinho não faz nada (2.6173ms)
  ✔ não mexe nos outros itens da lista (0.53ms)
  ✔ htmlCarrinho renderiza um input de quantidade por item, com o valor atual (79.7484ms)
  ✔ index.js ouve change no input de quantidade e usa definirQuantidadeNoCarrinho (1.1584ms)
✔ Quantidade manual no item (item 8, docs/depois-do-teste.md) (92.2714ms)
ℹ tests 11
ℹ suites 2
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 422.6039
```

Suíte completa do frontend (`npm test`): **359/359** passando (352 + 7 novos deste item).

---

## 5. Nota de processo

No caminho, rodando `cd demo && npm run testar` pra validar que o carrinho ainda funciona de ponta a ponta, achei um bug real e **sem relação com este item**: o stub de `window.print` em `demo/specs/harness.mjs` era um no-op puro (`() => {}`). `frontend/src/core/impressao.js` (`imprimirHtmlEmIframe`) espera o evento `afterprint` disparar para resolver a promessa de impressão — um `print()` que não faz nada nunca dispara esse evento, então qualquer teste que clicasse num botão de imprimir de verdade travava para sempre (o teste de fechar o caixa com comprovante, por exemplo, estourava timeout de 10s). Corrigido fazendo o stub disparar `afterprint` via `setTimeout` depois de chamado, tanto na janela principal quanto em popups abertos via `window.open`.

Corrigido junto porque: (1) afeta a suíte usada para validar qualquer mudança no PDV, inclusive este item; (2) já estava quebrando silenciosamente o CI recém-criado (item 5, `.github/workflows/ci.yml`) desde o push do item 9.

Ao destravar esse teste, apareceu uma **segunda falha**, essa sim potencialmente uma regra de negócio: fechar um turno e tentar reabrir no mesmo período (mesmo dia) deveria dar erro "Já existe um turno registrado para este período hoje", mas na suíte `demo/` isso não acontece. Verifiquei ao vivo na aplicação real (não na demo) que a regra funciona certinho — bloqueou a reabertura como esperado. Então o bug parece ser específico do ambiente de teste (suspeita: resolução de fuso horário `America/Recife` via `Intl.DateTimeFormat` divergindo nesse processo Node.js), não da regra em si. **Não corrigido agora** — registrado como investigação separada (tarefa sugerida ao usuário), sem relação com quantidade manual ou pagamento dividido.
