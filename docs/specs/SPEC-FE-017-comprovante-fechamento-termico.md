# SPEC-FE-017 — Comprovante de fechamento em cupom térmico 80 mm

- **Status:** Aprovada e implementada (2026-08-26). Revisão 2026-08-26: logo PNG 1-bit real + marca `CUPOM NÃO FISCAL`.
- **Data:** 2026-08-26
- **Módulo:** `frontend/src/modules/caixa-turno` (`fechamento.js` → `htmlComprovanteRevisao` / `imprimirHtml`)
- **Depende de:** SPEC-FE-003 (fluxo contar → revisar → imprimir → fechar), SPEC-BE-002 (`sem_impressao` só auditoria), SPEC-FE-007 §5 (mesmo mecanismo de impressão do cupom não fiscal)
- **PRD de origem:** `PRD-004-caixa-por-turno.md` (requisito de layout do papel, 2026-08-26)
- **Não muda:** POST `/caixa-turno/fechar`, trava de "Confirmar e fechar", caminho "Prosseguir sem impressão", cálculo de esperado/contado/diferença

---

## 0. Decisões já tomadas nesta spec (não reabrir na implementação)

### 0.1 Como imprimir — padrão já existente

Já existe impressão no projeto. **Não** entra biblioteca ESC/POS (`node-thermal-printer` etc.).

| Onde | Mecanismo |
|---|---|
| Fechamento de caixa | `fechamento.js` → `imprimirHtml` → `window.open('', '_blank')` **sem** `noopener` + `document.write` + `print()` (ISSUE-001) |
| Cupom de venda | `pdv/cupom.js` → `imprimirCupomHtml`, HTML com `.cupom { width: 72mm }`, fonte monoespaçada, linhas tracejadas |

O comprovante de fechamento **reusa `imprimirHtml`**. O que muda é o HTML/CSS gerado por `htmlComprovanteRevisao`. A janela de print continua `about:blank`; por isso a logo **não** pode ser um `src` relativo (some na aba de impressão). A PNG 1-bit entra como **data URI** no HTML.

### 0.2 Largura do papel

**80 mm** (pedido do operador; não informado 58 mm). Área útil igual ao cupom do PDV: bloco `.cupom` com **72 mm**, `@page { size: 80mm auto; margin: 4mm; }`. CSS só preto (`#000`) e branco (`#fff`) — sem cor, sem degradê, sem `color-mix`.

Asset aprovado: logo horizontal 1-bit PNG (`logo_horizontal_cupom_576px_1bit.png`, 576 px de largura). No repo: `frontend/assets/logo-horizontal-cupom-576px-1bit.png`. Embutida no HTML como **data URI PNG** (`dataUriLogoCupom` → `logo-cupom-data-uri.js`) para não sumir no `about:blank`. Regenerar com `frontend/scripts/gerar-logo-cupom-data-uri.mjs` se o PNG mudar. Placeholder SVG antigo (`logo-horizontal-cupom.svg`) não entra no papel.

### 0.3 Operador(a) responsável — proposta (confirmar antes do Passo 4)

O comprovante atual **não** traz operador. O domínio tem `aberto_por` / `fechado_por` (ids), mas `GET /caixa-turno/preview-fechamento` e `GET /caixa-turno/status` **não** devolvem nome. Na hora de imprimir o turno ainda não foi fechado (`fechado_por` ainda é nulo).

**Proposta desta spec (igual ao cupom do PDV, SPEC-FE-007 §5):** o nome é o usuário autenticado na sessão, `getUsuario().nome` — quem está confirmando o fechamento. Sem campo manual. Sem chamada nova ao backend neste corte.

Se a loja quiser o nome de **quem abriu** o turno (não de quem está fechando), isso exige campo no status/prévia e fica **fora** desta spec.

---

## 1. Objetivo técnico

Trocar o HTML genérico de `htmlComprovanteRevisao` (títulos `<h1>`/`<h2>` sem largura térmica, sem logo, sem operador, diferença só com `formatarMoeda` e cor implícita da tela) pelo **modelo 2** aprovado: cupom térmico 80 mm, monocromático, com bloco de operador, sinais de sobra/falta no papel e linha de assinatura.

O box de revisão **na tela** (cores, botões) não precisa copiar o papel. Só o que vai para a impressora segue este layout.

---

## 2. Layout do papel (ordem fixa)

Da esquerda para a direita, de cima para baixo:

1. Logo horizontal 1-bit (PNG), largura 100% do bloco 72 mm, `img` com data URI.
2. Título centralizado: `Comprovante de Fechamento de Caixa`.
3. Linha `CUPOM NÃO FISCAL` (mesmo texto do cupom de venda, SPEC-FE-007 §5) e subtítulo `Documento interno de controle — não é venda`. Este papel **não** é documento fiscal e **não** é comprovante de venda.
4. Linha tracejada (`border-top: 1px dashed #000`).
5. Dados do turno, uma linha cada, fonte monoespaçada:
   - `Turno: Tarde — Nº 11` (`periodo` `manha`→`Manhã`, `tarde`→`Tarde`; número = `turno_id`)
   - `Data:` data do turno (`turno.data` do cache de `estado.js`, senão data local `America/Recife`)
   - `Hora:` hora local do momento da impressão
6. Bloco com borda tracejada, título `Operador(a) responsável`, nome em negrito.
7. Seção `Esperado`: Dinheiro, Pix, Cartão — rótulo à esquerda, valor à direita (padding/tabs, não grid).
8. Seção `Contado`: mesmas três formas (dinheiro da revisão já soma espécie+moedas, como hoje).
9. Seção `Diferença`: mesmas três formas. Valor `0` → `R$ 0,00` sem sufixo. Valor `> 0` → `+ R$ … (sobra)`. Valor `< 0` → `- R$ … (falta)`. **Proibido** usar cor para classificar.
10. Total em destaque: borda dupla cima e baixo, fonte maior e negrito. Mesma regra de sinal/texto do item 9, com o rótulo da classificação (`Bateu certo` / total de sobra / total de falta).
11. Linha de assinatura: `________________________` + `Assinatura do operador`.
12. Rodapé centralizado: `S&M Panificadora — Souza & Moraes` (texto fixo deste comprovante; não misturar com o logo colorido das configurações).

`Cartão` continua consolidado (débito+crédito), como o cálculo atual. Não inventar linha de crédito.

---

## 3. Passos de implementação (cada um testável sozinho)

Não começar o passo seguinte sem o canário do anterior verde.

### Passo 1 — Funções puras de linha e de diferença (sem DOM, sem print)

Novo recorte em `fechamento.js` (ou `comprovante.js` importado por `fechamento.js`):

```js
formatarPeriodoTurno('tarde')           // 'Tarde'
formatarRotuloTurno({ periodo, turno_id }) // 'Tarde — Nº 11'
formatarDiferencaCupom(-5.5)            // contém '-' e '(falta)' e o valor absoluto
formatarDiferencaCupom(3)               // contém '+' e '(sobra)'
formatarDiferencaCupom(0)               // 'R$ 0,00' sem sobra/falta
htmlLinhaValor(rotulo, valorTexto)      // duas colunas em <pre> ou tabela 100%, td direita nowrap
```

- **Testável:** `frontend/tests/caixa-turno/passo3-4.test.js` (novos casos no mesmo arquivo). Sem abrir janela. Sem `index.html`.

### Passo 2 — HTML do comprovante no layout térmico, ainda sem logo binária

`htmlComprovanteRevisao(revisao)` passa a devolver documento completo (`<!DOCTYPE html>`) com:

- `@page { size: 80mm auto; margin: 4mm; }`
- `.cupom { width: 72mm; font-family: Consolas, 'Courier New', monospace; color: #000; background: #fff; }`
- título, tracejado, turno/data/hora, esperado, contado, diferença com `formatarDiferencaCupom`, total em `.total-destaque`, assinatura, rodapé fixo
- `revisao.operador` vazio → emite `—` no bloco (o Passo 4 preenche)

O teste legado *comprovante imprimível detalha diferença por forma* **quebra** de propósito (hoje casa `<h2>Diferença</h2>`). Substituir por asserts do modelo 2: título longo, `Esperado`, `Contado`, `Diferença`, `(sobra)`/`(falta)` quando o valor não é zero, `Souza & Moraes`, `72mm` ou `80mm` no CSS, **nenhum** `color:` que não seja `#000`/`#111`/`#fff`.

- **Testável:** só `htmlComprovanteRevisao({...})` + `assert.match` / `assert.doesNotMatch`. Print ainda não entra.

### Passo 3 — Logo 1-bit PNG no HTML (data URI)

1. Copiar o PNG anexado para `frontend/assets/logo-horizontal-cupom-576px-1bit.png`.
2. Gerar `frontend/src/modules/caixa-turno/logo-cupom-data-uri.js` com `frontend/scripts/gerar-logo-cupom-data-uri.mjs` (escreve o arquivo; **não** despeja base64 no terminal).
3. `dataUriLogoCupom()` devolve essa constante. `<img alt="S&M Panificadora" src="data:image/png;base64,...">` no topo do `.cupom`.
4. Canário: HTML contém `data:image/png;base64,` e `alt="S&M Panificadora"`. Não contém `src="/assets/` (quebraria no `about:blank`). Não contém `data:image/svg`.

- **Testável:** o mesmo teste de HTML, sem impressora.

### Passo 3b — Marca de cupom não fiscal (isolado, sem mudar números)

Depois do título, duas linhas centralizadas em fonte menor:

- `CUPOM NÃO FISCAL`
- `Documento interno de controle — não é venda`

Não altera esperado/contado/diferença, `sem_impressao`, nem o fluxo de impressão.

- **Testável:** `htmlComprovanteRevisao({...})` contém os dois textos. Teste do Passo 3 (data URI PNG) continua verde.

### Passo 4 — Preencher operador, data e hora na hora de imprimir

Em `caixa-turno/index.js`, ao montar `revisaoAtual` / ao clicar **Imprimir comprovante**:

- `operador`: `getUsuario()?.nome || ''`
- `data`: `getTurnoAtual` cache `turno.data` formatada `pt-BR`, senão data local
- `hora`: `toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })` no clique de imprimir (não congelar na contagem)

`criarControleImpressao` / `imprimirHtml` **não mudam**. `sem_impressao` **não muda**.

- **Testável:** teste do HTML com `operador: 'Maria'` contém `Operador(a) responsável` e `Maria`. Teste do controle de impressão existente continua passando (imprimiu → libera confirmar; falha → mostra exceção).

### Passo 5 — Conferência visual no browser (não automatizada)

Com o frontend em `4173`, fechar um turno de teste: Imprimir comprovante → diálogo do Windows → destino "Microsoft Print to PDF" ou a térmica 80 mm.

Checklist:

- [ ] Logo nítida, sem cinza
- [ ] Não corta nas laterais
- [ ] Valores alinhados à direita
- [ ] Sobra/falta legível sem cor
- [ ] Assinatura e rodapé visíveis
- [ ] "Prosseguir sem impressão" continua só depois de falha

Se a térmica real for 58 mm, parar e ajustar `@page` — não chutar.

---

## 4. Fora de escopo

- Driver ESC/POS, fila de impressão no backend, PDF gerado no servidor
- Mudar o box de revisão na tela (cores, layout do modal)
- Segundo botão de impressão no resumo pós-fechamento (PRD-004 critério 7)
- Linha separada de crédito; nome de quem abriu o turno (sem confirmação do item 0.3)
- Trocar a logo colorida do login/shell

---

## 5. Critérios de aceite

1. Impressão continua por `imprimirHtml` (HTML + `print()`), sem pacote ESC/POS.
2. Papel 80 mm / bloco 72 mm, só preto e branco.
3. Ordem da Seção 2 completa no HTML gerado.
4. Diferença por forma e total usam `+`/`-` e `(sobra)`/`(falta)` quando ≠ 0; nunca cor como único sinal.
5. Logo via data URI **PNG** (arquivo fonte `frontend/assets/logo-horizontal-cupom-576px-1bit.png`); não some no `about:blank`.
6. O papel traz `CUPOM NÃO FISCAL` e deixa explícito que é documento interno, não venda.
7. `sem_impressao` e a trava de "Confirmar e fechar" iguais à SPEC-FE-003 Passo 4.
8. Passos 1→4 têm canário verde isolado; Passo 5 conferido na loja ou em PDF.

---

## 6. Rastreio

- ISSUE-001 (janela em branco) — não reabrir `noopener`
- ISSUE-002 (diferença por forma) — manter as três formas; só muda o formato monocromático
- SPEC-FE-007 §5 — mesmo padrão de cupom 72 mm / monoespaçado
