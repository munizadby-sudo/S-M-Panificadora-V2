# ISSUE-007 — Setas da grade de produtos param depois da busca (F1) ou da troca de categoria

- **Status:** Corrigido (2026-08-26)
- **Data:** 2026-08-26
- **Módulo:** `frontend/src/modules/pdv` (`index.js` → `tratarAtalhoPdv` / `selecionarCategoriaPorIndice`; `atalhos.js` → `setasNavegamPelaGrade`; `navegacao-grade.js` → `ligarNavegacaoGrade`)
- **Severidade:** Média — no balcão o operador deixa de navegar os produtos com o teclado depois de um fluxo comum (buscar e voltar para Todas / outra categoria); a venda em si não se perde, mas o atalho documentado na tela deixa de funcionar.
- **Relacionado:** SPEC-FE-007 (Vendas / atalhos F1 e F2–F8, §11.2 item 4); SPEC-FE-015 §3.5 (roving tabindex na grade); relato do operador na loja em 2026-08-26

---

## 1. Sintoma

Na tela **Vendas**, com o caixa aberto:

1. As setas `←` `→` `↑` `↓` navegam os cards de produto — ok.
2. `F1` foca a busca — ok.
3. O operador volta para a categoria **Todas** (`F2`) — ou escolhe outra categoria (`F3`–`F8` / select).
4. As setas **não movem mais os produtos**.

O mesmo travamento vale para as outras categorias, não só Todas.

---

## 2. Causa

`F1` deixa o foco em `#pdv-busca`. `F2`–`F8` recarregam o catálogo e o `renderizar()` restaurava o cursor na busca (`capturarFocoUi` / `restaurarFocoUi`). Com o foco num `INPUT`/`SELECT`, `deveRoubarTeclaDeEdicao` abortava o atalho global **antes** de encaminhar a seta para a grade.

O `keydown` da grade só dispara com foco **dentro** de `#pdv-grade-itens`. A busca e o select de categoria ficam fora desse container — então, com o cursor na busca, só o handler global poderia mover a grade, e ele saía cedo.

Efeito colateral: se a seta fosse encaminhada com o foco ainda fora dos cards, o índice avançava a partir do card 0 e **pulava o primeiro produto**.

---

## 3. Correção aplicada

- `selecionarCategoriaPorIndice` (`F2`–`F8`): limpa a busca, recarrega o catálogo e chama `renderizar({ focarGrade: true })` — o primeiro card da grade recebe o foco.
- Mudança no `<select id="pdv-categoria">`: também foca a grade depois do reload.
- `setasNavegamPelaGrade` (`atalhos.js`): `↑`/`↓` na busca e qualquer seta no select de categoria entram na grade; `←`/`→` na busca continuam no cursor do campo.
- `ligarNavegacaoGrade`: se o foco não está num card, a primeira seta **entra** no card atual sem pular o primeiro.

---

## 4. Teste permanente (canário)

- `frontend/tests/pdv/navegacao-grade.test.js` — caso "seta com foco fora da grade entra no card atual sem pular o primeiro"
- `frontend/tests/pdv/passo8.test.js` — caso "depois da busca, setas voltam para a grade (F2/categoria e ↑↓ na busca)"

Log bruto de `npm.cmd test` (frontend, só os canários desta issue):

```
cwd: c:\Users\Panificadora S&M\Desktop\PDV_2V\S-M-Panificadora-V2\frontend
command: npm.cmd test -- tests/pdv/navegacao-grade.test.js tests/pdv/passo8.test.js

npm warn Unknown env config "devdir". This will error in a future major version of npm. See `npm help npmrc` for supported config options.
npm notice run test
npm notice run node --test tests/pdv/navegacao-grade.test.js tests/pdv/passo8.test.js
▶ PDV — navegação por teclado na grade (SPEC-FE-015)
  ✔ grade usa roving tabindex sem a legenda de atalhos (78.6222ms)
  ✔ setas movem o índice dentro dos limites (0.6702ms)
  ✔ seta vertical não pula item no meio quando cabe numa linha (0.591ms)
  ✔ roving tabindex marca um único card com tabindex 0 (0.9939ms)
  ✔ o mesmo evento de seta não avança duas vezes (1.5336ms)
  ✔ seta com foco fora da grade entra no card atual sem pular o primeiro (0.9255ms)
✔ PDV — navegação por teclado na grade (SPEC-FE-015) (87.5224ms)
▶ Passo 8 — atalhos de balcão (V1)
  ✔ F2 é Todas e F3–F8 seguem a ordem das categorias (4.032ms)
  ✔ Delete não rouba tecla de campo digitável; Enter na busca adiciona (1.0374ms)
  ✔ depois da busca, setas voltam para a grade (F2/categoria e ↑↓ na busca) (1.0741ms)
  ✔ legenda visível documenta F1, F2–F8, Delete e Esc, sem summary (1.2961ms)
  ✔ módulo coloca a legenda acima do título Vendas (1.5842ms)
  ✔ módulo registra o mapa completo de atalhos, não só F10 (1.3433ms)
✔ Passo 8 — atalhos de balcão (V1) (16.6178ms)
▶ Passo 8 — cupom não fiscal
  ✔ html traz número, itens, total e aviso de não fiscal (82.1261ms)
  ✔ dinheiro inclui recebido e troco (2.438ms)
  ✔ imprimirCupomHtml escreve na janela sem noopener (3.474ms)
✔ Passo 8 — cupom não fiscal (88.9057ms)
ℹ tests 15
ℹ suites 3
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 464.974
```
