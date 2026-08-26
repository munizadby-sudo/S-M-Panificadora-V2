# SPEC-FE-007 — PDV / Vendas (Frontend)

- **Status:** Implementada (Passos 1–8 + refinos de balcão 2026-08-26)
- **Data:** 2026-08-17 (atualizada 2026-08-26 — atalhos de balcão, cupom, modal de pagamento, navegação da grade)
- **Módulo:** `frontend/src/modules/pdv`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-FE-003 (`estado.js` do Caixa por Turno — consumido, nunca reimplementado), SPEC-FE-004/005 (produto/estoque, referência de padrão), SPEC-FE-015 §3.4–3.5 (legenda de atalhos e navegação na grade), SPEC-BE-007 (contrato de API), SPEC-BE-003 (identidade pública da loja no cupom)
- **PRD de origem:** `PRD-003-pdv-vendas.md`
- **Referência funcional V1 (não importar código):** `initAtalhosTeclado` e `abrirCupomNaoFiscal` do legado / `padaria-pdv`

---

## 1. Objetivo técnico

Especificar a tela mais usada do sistema: grade de produtos, carrinho, finalização da venda por teclado — sempre bloqueada quando o caixa está fechado, sempre traduzindo erros técnicos do backend (`CAIXA_FECHADO`, estoque insuficiente) em mensagens que a balconista entende sem pensar.

O operador deve conseguir **montar o pedido e confirmar o pagamento sem mouse** (PRD-003, critérios 4 e 5; PRD-016 §4 — operação por atalhos como fluxo principal).

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/pdv/index.js
export default {
  id: 'pdv',
  label: 'Vendas',
  icone: 'ti-shopping-cart',
  permissao: 'caixa',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

**Regra de acoplamento (crítica):** este módulo **nunca** chama `GET /api/caixa-turno/status` diretamente — sempre consulta o estado através de `modules/caixa-turno/estado.js` (SPEC-FE-003, Seção 2).

### 2.1 Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `index.js` | Orquestra montagem, atalhos globais da tela, F10, confirmação |
| `aviso.js` | Tela de bloqueio com caixa fechado |
| `grade.js` | Grade, filtros, `htmlLegendaAtalhos` (lista sempre visível) |
| `navegacao-grade.js` | Roving tabindex e setas na grade |
| `carrinho.js` | Estado local do pedido (add/remove/limpar/total de exibição) |
| `pagamento.js` | Formas, troco, `podeConfirmarVenda`, atalhos `1`/`2`/`3`/`4`, HTML do modal |
| `modal-pagamento.js` | Overlay de checkout; `Esc` fecha sem limpar o carrinho |
| `confirmacao.js` | Faixa “Venda confirmada” com número/total do backend |
| `cupom.js` | HTML do cupom não fiscal + abertura da janela de impressão |
| `atalhos.js` | Mapa `F2`–`F8` e regras de “não roubar tecla de campo” |
| `api.js` | `POST /api/vendas` e tradução de erro |

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

Testes: `frontend/tests/pdv/passo1.test.js` … `passo5-7.test.js`, `passo8.test.js`, `navegacao-grade.test.js`.

### Passo 1 — Banner de status + bloqueio quando caixa fechado

- Reaproveitar o banner de turno (SPEC-FE-003) no shell — o PDV **não** redesenha o banner dentro da tela.
- Se `turnoEstaAberto() === false`: a tela inteira exibe aviso claro **no lugar** da grade e do carrinho.
- **Testável:** PDV sem turno aberto → só o bloqueio; com turno aberto → grade.

### Passo 2 — Grade de produtos e carrinho

- Grade de produtos ativos (`GET /api/produtos` + categorias), busca rápida e filtro.
- Carrinho local (não persiste até confirmar): adicionar, remover item, remover último, limpar.
- Total local **só para exibição** — o valor que conta é o do backend na confirmação (SPEC-BE-007 §4.1).
- **Testável:** vários itens, total local certo, remoção recalcula.

### Passo 3 — Seleção de forma de pagamento e confirmação

- Formas: `dinheiro`, `pix`, `cartao` (rótulo **Débito**), `credito` — whitelist da SPEC-BE-007 §2.2.
- Troco quando `dinheiro` (recebido − total).
- Submeter via `POST /api/vendas`.
- Erros por código:
  - `403 CAIXA_FECHADO` → mensagem de negócio e atualização do status do turno (outra estação pode ter fechado o caixa).
  - `400` estoque insuficiente → identifica o produto; **não** descarta o carrinho.
- **Testável:** venda ok; depois quantidade acima do estoque → mensagem daquele item.

### Passo 4 — Confirmação de sucesso e limpeza

- Após sucesso: exibir `numero`, `total` e forma **devolvidos pelo backend**; limpar o carrinho.
- **Testável:** carrinho vazio na sequência, sem recarregar a página.

### Passo 5 — Bloquear confirmação com recebido insuficiente

- `podeConfirmarVenda({ itens, formaPagamento, recebido })` retorna `false` se `dinheiro` e recebido menor que o total (ou vazio/inválido).
- `pix` / `cartao` / `credito`: basta item + forma.
- **Testável:** dinheiro com valor menor → “Confirmar venda” desabilitado.

### Passo 6 — Atalhos dentro do painel de pagamento

Com `#pdv-pagamento` focado (modal aberto):

| Tecla | Forma |
|---|---|
| `1` | Dinheiro |
| `2` | Pix |
| `3` | Débito (`cartao`) |
| `4` | Crédito (`credito`) |

- `Enter` confirma se o botão estiver habilitado.
- Ao escolher Dinheiro, o foco vai para `#pdv-recebido`. **Dentro desse campo**, `1`/`2`/`3`/`4` **não** trocam a forma (precisa digitar o valor).
- Cada botão de forma mostra a tecla (`1`…`4`) no próprio cartão.
- **Testável:** item no carrinho → modal → `2` → `Enter` registra a venda sem mouse. Crédito: `4`.

### Passo 7 — Pagamento em modal (`F10` / Finalizar Venda)

O seletor de forma **não** fica no fluxo da tela principal. Abre em overlay:

- Botão **Finalizar Venda** (indicação visual `F10`) ou tecla `F10`.
- Só abre com ao menos 1 item e total local &gt; 0; senão, aviso na lateral e o modal **não** abre.
- `Esc` (X, **Cancelar** ou clique no fundo) fecha o modal **sem** limpar o carrinho.
- Comportamento dos Passos 3, 5 e 6 permanece — só muda o container.
- Layout e regras visuais do modal: Seção 11.3.

### Passo 8 — Atalhos de balcão e cupom não fiscal (herdados do V1)

Completa o mapa do V1 (`initAtalhosTeclado` + `abrirCupomNaoFiscal`) que o PRD-003 já pedia e que os Passos 6–7 cobriam só no checkout.

Com a tela de Vendas montada, turno aberto e **modal de pagamento fechado** — ver Seção 4.

Depois de `POST /api/vendas` com sucesso — ver Seção 5.

- **Testável:** `F1` foca a busca; `Delete` reduz o carrinho; `F10` → `2` → `Enter`; cupom contém “CUPOM NÃO FISCAL” e o número da venda (`passo8.test.js`).

---

## 4. Mapa de atalhos (balcão)

A legenda na UI é uma barra sempre visível (`ul.pdv-atalhos`, `htmlLegendaAtalhos` em `grade.js`) **acima** do título **Vendas**: teclas em `--aviso`, textos em `--muted`, rótulos curtos no estilo da V1. Sem `<details>`/`<summary>`. A barra documenta só atalhos da tela de Vendas (`F1`…`F10`, setas, `Enter`, `Del`, `Esc`) — **não** lista `1`/`2`/`3`/`4` (esses só valem com o modal aberto). A tabela abaixo é a fonte de verdade do comportamento.

### 4.1 Modal de pagamento fechado

Handler: `tratarAtalhoPdv` em `index.js`. Se o modal estiver aberto, este handler **não** roda (o painel de pagamento trata `1`/`2`/`3`/`4`/`Enter`/`Esc`).

| Tecla | Ação |
|---|---|
| `F1` | Foca `#pdv-busca` |
| `F2` | Categoria **Todas**; limpa a busca e foca o primeiro produto da grade |
| `F3`–`F8` | 1ª … 6ª categoria ativa, na ordem da lista. Sem categoria nesse índice: no-op. Também limpa a busca e foca a grade |
| `F10` | Abre o modal de pagamento (mesma regra do botão Finalizar Venda) |
| `←` `→` `↑` `↓` | Navegam a grade (reusa `ligarNavegacaoGrade`). **Não** disparam se o foco está em `input`/`select`/`textarea`. Um único passo por tecla (Seção 11.2) |
| `Enter` na grade | Adiciona o produto focado e **mantém** o foco no mesmo card |
| `Enter` em `#pdv-busca` | Aplica a busca e adiciona o **primeiro** produto da grade (leitor / busca rápida) |
| `Delete` | Remove o último item (igual a “Remover último”). **Não** dispara em campo digitável |
| `Esc` | Se o carrinho tem item: confirma e limpa. Carrinho vazio: no-op |
| `Tab` | Sai da grade (não é interceptado) |

### 4.2 Modal de pagamento **aberto**

| Tecla | Ação |
|---|---|
| `1` / `2` / `3` / `4` | Dinheiro / Pix / Débito / Crédito (exceto com foco em `#pdv-recebido`) |
| `Enter` | Confirma a venda, se habilitado |
| `Esc` | Fecha o modal, **carrinho intacto** |

---

## 5. Cupom não fiscal

Não é cupom fiscal (fora de escopo). É o ticket de balcão do V1, reimplementado em `cupom.js`.

**Quando:** imediatamente após venda **confirmada** (carrinho já limpo, faixa de sucesso já na tela).

**Conteúdo:**

- Nome da loja e slogan via `GET /configuracoes/publico` (fallback: `S&M Panificadora`)
- Título **CUPOM NÃO FISCAL**
- Número do pedido (`numero`, 4 dígitos), data/hora, operador (`getUsuario().nome`)
- Itens: nome, quantidade, unitário, subtotal (snapshot do carrinho local no momento do POST)
- Total **do backend**, rótulo da forma
- Se `dinheiro`: recebido e troco
- Rodapé: “Este ticket não é documento fiscal”

**Impressão:** `window.open('', '_blank')` **sem** `noopener`/`noreferrer` (ISSUE-001). Falha de pop-up ou de print **não** desfaz a venda, **não** restaura o carrinho e **não** apaga a confirmação na tela.

---

## 6. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| Banner de turno | Shell / SPEC-FE-003 — não duplicado no PDV |
| `AvisoCaixaFechado` | Bloqueio da tela quando não há turno |
| Legenda de atalhos | Barra compacta acima de **Vendas** (tecla amarela, texto cinza); sem atalhos de forma |
| `GradeProdutos` | Busca, categoria, cards |
| `Carrinho` | Itens, total local, remover último, limpar |
| Botão Finalizar Venda | Abre o modal; `F10` no rótulo; verde + pulso só com item no carrinho |
| `SeletorFormaPagamento` | Modal “Tipo de pagamento”: formas em lista, recebido só em dinheiro |
| `ConfirmacaoVenda` | Número/total/forma após sucesso |
| `CupomNaoFiscal` | Ticket de balcão |

---

## 7. Tratamento de erro

| Situação | Tratamento na UI |
|---|---|
| `403 CAIXA_FECHADO` | Mensagem de negócio + recarrega status do turno; se fechou, some o modal |
| `400` — carrinho vazio | Não alcançável (botão/F10 recusam) |
| `400` — estoque insuficiente | Mensagem com o produto; carrinho permanece; modal permanece aberto |
| `F10` / Finalizar com carrinho vazio | Aviso na lateral; modal não abre |
| Impressão do cupom falhou | Venda já confirmada permanece; operador segue para o próximo pedido |

---

## 8. Diferenças em relação ao V1 (rastreabilidade)

| Item | V1 | V2 |
|---|---|---|
| Onde vivem os atalhos | `initAtalhosTeclado` no `app.js` monolítico | `atalhos.js` + `tratarAtalhoPdv` no módulo `pdv` |
| Checkout | Evoluiu de grade no rodapé para modal `F10` (legado `padaria-pdv`) | Modal `F10` / Finalizar Venda desde o Passo 7 |
| Teclas `1`/`2`/`3`/`4` no modal | Pix / Dinheiro / Cartão (ordem do legado visual); crédito variou | Dinheiro / Pix / Débito / Crédito — alinhado à ordem dos botões da V2 |
| Quarta forma (crédito) | Variou entre versões do legado | Tecla `4` no botão e no handler |
| Visual do modal | Lista vertical, total verde, forma selecionada verde, recebido só em dinheiro | Mesmo desenho (referência visual, sem copiar código) |
| Legenda de atalhos | Faixa no rodapé do caixa | Barra acima de **Vendas**; sem `1`/`2`/`3`/`4` |
| Cupom não fiscal | `abrirCupomNaoFiscal` após sucesso | `cupom.js`; mesma regra de janela da ISSUE-001 |
| Checagem de caixa | Misturada na tela | Só via `estado.js` |
| Estoque insuficiente | Erro técnico / 500 no legado backend | Mensagem de negócio, item identificado |
| Recebido insuficiente em dinheiro | Podia confirmar | Botão desabilitado (Passo 5) |

---

## 9. Fora de escopo desta SPEC

- Pagamento via TEF — contrato de integração (PRD backend §4.16), ainda não especificado.
- Emissão de **cupom fiscal** / NFC-e (PRD backend §4.17). O Passo 8 cobre só o ticket não fiscal.
- Tela de resolução de correções pendentes (`POST /api/vendas/correcoes/:id/resolver`) — ação de `admin`; o aviso na abertura do turno é da SPEC-FE-003.
- Desconto / promoção — não existia no V1 e não está confirmado (PRD-003 §6).
- Touch / teclado virtual.

---

## 10. Critérios de aceite técnicos

1. Nenhuma chamada a `GET /api/caixa-turno/status` neste módulo — sempre `estado.js`.
2. Com turno fechado, grade e carrinho não são montados — o bloqueio aparece primeiro.
3. Erro de estoque insuficiente identifica o produto, nunca uma mensagem genérica no carrinho inteiro.
4. O total após confirmar é o do backend, nunca o somado localmente.
5. `podeConfirmarVenda` não habilita confirmação em `dinheiro` com recebido menor que o total.
6. `1`/`2`/`3`/`4`/`Enter` no pagamento não interferem com as setas da grade — handlers em momentos/containers distintos (modal aberto vs. fechado).
7. `F1`, `F2`–`F8`, `Delete` e `Esc` (limpar carrinho) funcionam com o PDV montado e o modal fechado; `Delete` não remove item enquanto o operador digita num campo.
8. `F10` / Finalizar Venda só abrem o modal com item e total &gt; 0; `Esc` no modal não limpa o carrinho.
9. Após venda confirmada, o cupom não fiscal é emitido; falha de impressão não apaga a confirmação nem restaura o carrinho.
10. Suíte `frontend/` (`passo1`–`passo8` e navegação da grade) passa 100%.
11. Setas na grade avançam **um** card por tecla; numa linha só, `↑`/`↓` não pulam para a ponta (Seção 11.2).
12. Depois de `Enter` na grade, o mesmo produto permanece focado. Depois da busca com debounce, o cursor permanece em `#pdv-busca`. `F2`–`F8` e mudança no select de categoria devolvem o foco à grade para as setas funcionarem.
13. `#pdv-recebido-wrap` tem `hidden` (e CSS `display: none !important`) em qualquer forma que não seja `dinheiro`.
14. A barra `ul.pdv-atalhos` **não** contém “Forma de pagto” / `1/2/3/4`.
15. `#btn-finalizar-venda` usa `--sucesso` + pulso só quando habilitado; desabilitado fica mudo.

---

## 11. Refinos de balcão (2026-08-26)

Decisões do operador na loja, depois do Passo 8. Referência visual: modal e barra de atalhos do V1 (`padaria-pdv`) — **não importar código**.

### 11.1 Legenda de atalhos

- Sempre visível acima do `h1` **Vendas** (`header.pdv-topo` + `htmlLegendaAtalhos()`).
- Teclas `--aviso`, descrições `--muted`, faixa com borda `--linha` (como a faixa do V1).
- Itens: `F1` Buscar · `F2-F8` Categorias · `←→↑↓` Navegar produtos · `Enter` Adicionar item · `Del` Remover último item · `Esc` Fechar modal / Limpar · `F10` Finalizar Venda.
- Removido da barra: `1/2/3/4 Forma de pagto` — essas teclas só existem no modal (Passo 6).
- Não copiar da V1: `F9`, `1–4` na tela principal, `+` focar recebido.

### 11.2 Navegação da grade

Três falhas vistas no balcão (Pão Doce / Pão Francês / Sonho):

1. **Seta pulava o meio.** O `keydown` da grade e o atalho global (`tratarAtalhoPdv`) tratavam o mesmo evento. Correção: `evento.defaultPrevented` aborta o segundo handler. `←`/`→` andam um índice.
2. **`↑`/`↓` numa linha só iam para a ponta.** `indiceAposSeta` somava `colunas` e clampeava no último item. Sem linha abaixo/acima, o índice **não muda**.
3. **Foco sumia.** `renderizar()` recria o DOM (busca com debounce 250 ms, `Enter` no card). `capturarFocoUi` / `restaurarFocoUi` em `index.js` devolvem busca (com `selectionStart`/`selectionEnd`), categoria ou o card `data-adicionar-produto`. Anel visível: `.pdv-produto:focus`, `:focus-visible` e `.pdv-produto-foco` (`--selecao`).
4. **Setas mortas depois do F1 / categoria.** `F1` foca `#pdv-busca`; `F2`–`F8` re-renderizavam e devolviam o cursor à busca (ou o select `#pdv-categoria` engolia as setas). Correção: atalho de categoria limpa a busca e foca o primeiro produto (`renderizar({ focarGrade: true })`); `↑`/`↓` na busca e qualquer seta no select entram na grade **sem pular** o card atual (`setasNavegamPelaGrade`). `←`/`→` na busca continuam movendo o cursor do campo.

Testes: `navegacao-grade.test.js` (passo único por evento; vertical sem pular na linha; seta com foco fora não pula o primeiro). `passo8.test.js` (`setasNavegamPelaGrade`).

### 11.3 Modal “Tipo de pagamento”

Layout alinhado ao checkout do V1, com as **quatro** formas da V2:

- Título do overlay: **Tipo de pagamento** (`modal-pagamento.js`).
- Faixa **Total a pagar** + valor grande em `--sucesso`.
- Formas em coluna: tecla + ícone + rótulo. Ordem e teclas: `1` Dinheiro, `2` Pix, `3` Débito (`cartao`), `4` Crédito. Selecionada: fundo `--sucesso` (exceção à SPEC-FE-015 §3.1/`--selecao`, pedido do operador em 2026-08-26 para ficar igual à V1).
- **Valor recebido (R$)** só com Dinheiro (`#pdv-recebido-wrap[hidden]`). Pix / Débito / Crédito / nenhuma forma: o painel não aparece. `.pdv-pagamento label { display: grid }` **não** pode vencer o `hidden` — regra `#pdv-recebido-wrap[hidden] { display: none !important; }`.
- Dinheiro sem valor (ou menor que o total): texto “Informe o valor recebido” / “Valor insuficiente”; **Confirmar** desabilitado. Recebido ≥ total: mostra troco.
- Rodapé: **Cancelar Esc** (fecha, carrinho intacto) e **Confirmar venda Enter** (pulso `--sucesso` quando habilitado).
- `prefers-reduced-motion: reduce` desliga o pulso.

Testes: `passo3.test.js` (wrap `hidden` fora de dinheiro), `passo5-7.test.js` (Débito/Crédito e teclas 3/4).

### 11.4 Botão Finalizar Venda

`#btn-finalizar-venda` na lateral do carrinho:

- Carrinho vazio: cinza, sem brilho, sem animação, `disabled`.
- Com item e total &gt; 0: gradiente `--sucesso`, `--brilho-sucesso`, pulso (`@keyframes pdv-finalizar-pulso`). Hover mais claro; `:active` `scale(0.97)`.
- Papel de botão: SPEC-FE-015 §3.3 (sucesso).
