# ISSUE-009 — Modal de Caixa troca para “Fechar caixa” logo após a abertura

- **Status:** Corrigido (2026-08-30)
- **Data:** 2026-08-30
- **Módulo:** `frontend/src/modules/caixa-turno` (`index.js` → `renderizarAbertura` / `abrirModalCaixa`)
- **Severidade:** Média — o turno abre certo, mas o operador fica preso numa tela de fechamento no instante em que precisa vender.
- **Relacionado:** SPEC-FE-003 (Passo 2); SPEC-FE-015 §7 (modal pelo banner); SPEC-FE-020 (Chromium); relato do operador na loja em 2026-08-30

---

## 1. Sintoma

1. Clicar no banner **Caixa fechado**.
2. Conferir o fundo e confirmar a abertura.
3. O modal **não some**. A tela vira **Caixa** com um único botão vermelho **Fechar caixa**.
4. Atrás, Vendas já mostra o caixa aberto (R$ 0,00 / grade).

O operador acabou de abrir o turno e a UI sugere o contrário.

---

## 2. Causa

Depois do `POST /caixa-turno/abrir` com sucesso, `renderizarAbertura` chamava `renderizarTela()`. O cache do turno já estava `aberto`, então o painel ia para `renderizarFechamento` — o CTA de encerrar o expediente.

---

## 3. Correção aplicada

Em `renderizarAbertura`, sucesso de `abrirTurno` chama `fecharModalCaixa()` em vez de `renderizarTela()`.

O banner no header atualiza via `onMudancaDeTurno`. **Fechar caixa** só aparece se o operador clicar de novo no banner com o turno aberto.

No Chromium da demo (`demo/specs/harness.mjs`): `abrirTurnoSeFechado` espera o modal sumir; `fecharTurnoSeAberto` cobre o fechamento ponta a ponta. Não se reabre o mesmo período no mesmo dia (`PeriodoJaRegistradoError`) — o teste de navegador confirma o formulário de abertura e a mensagem de período já registrado.

---

## 4. Teste permanente (canário)

- `frontend/tests/caixa-turno/passo1.test.js` — “depois de confirmar a abertura o modal fecha em vez de mostrar Fechar caixa”
- `frontend/tests/caixa-turno/passo1.test.js` — “fecha o caixa e a próxima abertura fecha o modal em vez de Fechar caixa”
- `demo/specs/navegador.test.js` — “passos 3–4: fecha o turno e o próximo clique no banner volta à abertura”

Log bruto de `npm.cmd test` (frontend, canários desta issue + suíte do mesmo comando):

```
cwd: c:\Users\Panificadora S&M\Desktop\PDV_2V\S-M-Panificadora-V2\frontend
command: npm.cmd test -- tests/caixa-turno/passo1.test.js tests/pdv/passo8.test.js tests/impressao.test.js tests/shell.test.js

npm warn Unknown env config "devdir". This will error in a future major version of npm. See `npm help npmrc` for supported config options.
npm notice run test
npm notice run node --test tests/caixa-turno/passo1.test.js tests/pdv/passo8.test.js tests/impressao.test.js tests/shell.test.js
▶ Passo 1 — estado e banner de caixa
  ✔ getTurnoAtual consome GET /caixa-turno/status e cacheia (8.1538ms)
  ✔ banner mostra Caixa fechado e Caixa aberto com período (3.307ms)
  ✔ módulo exporta API de modal (SPEC-FE-015 §7) (1.7093ms)
  ✔ nenhum outro módulo chama GET caixa-turno/status direto (133.0938ms)
  ✔ index.html monta banner clicável no header sem registrar rota de caixa (2.0546ms)
  ✔ indicador de turno fica no header (.topo-direita), não entre nav e main (1.6836ms)
  ✔ módulo caixa-turno não duplica o banner de status (1.5031ms)
  ✔ X/Esc fecham o modal mesmo na revisão com Confirmar desabilitado (94.5037ms)
  ✔ depois de confirmar a abertura o modal fecha em vez de mostrar Fechar caixa (4.6782ms)
  ✔ fecha o caixa e a próxima abertura fecha o modal em vez de Fechar caixa (38.2334ms)
✔ Passo 1 — estado e banner de caixa (294.2954ms)
▶ impressão sem aba do Chrome
  ✔ cupom e fechamento usam iframe oculto, não window.open (7.1862ms)
  ✔ escreve o HTML, chama print e remove o iframe (4.2794ms)
✔ impressão sem aba do Chrome (15.3493ms)
▶ Passo 8 — atalhos de balcão (V1)
  ✔ F2 é Todas e F3–F8 seguem a ordem das categorias (6.1037ms)
  ✔ Delete não rouba tecla de campo digitável; Enter na busca adiciona (1.5901ms)
  ✔ depois da busca, setas voltam para a grade (F2/categoria e ↑↓ na busca) (2.1837ms)
  ✔ legenda visível documenta F1, F2–F8, Delete e Esc, sem summary (6.1087ms)
  ✔ módulo coloca a legenda acima do título Vendas (2.222ms)
  ✔ módulo registra o mapa completo de atalhos, não só F10 (2.0884ms)
✔ Passo 8 — atalhos de balcão (V1) (25.8306ms)
▶ Passo 8 — cupom não fiscal
  ✔ html traz número, itens, total e aviso de não fiscal (81.5837ms)
  ✔ dinheiro inclui recebido e troco (2.6076ms)
  ✔ venda abre box flutuante e só imprime no botão Imprimir (5.2698ms)
  ✔ imprimirCupomHtml imprime no iframe sem abrir aba (1.8123ms)
✔ Passo 8 — cupom não fiscal (92.2377ms)
▶ shell e guarda de rota
  ✔ index.html redireciona para login quando não há sessão (8.1686ms)
  ✔ index.html não redireciona quando há sessão (1.4134ms)
  ✔ login.html redireciona para o shell quando já autenticado (1.3178ms)
  ✔ index.html e login.html definem layout para janela estreita (1.9451ms)
  ✔ nenhum arquivo fora de core/api.js chama fetch() (97.1217ms)
  ✔ topo e login mostram a logo, sem o nome em texto (1.4438ms)
  ✔ router só é carregado depois da guarda de sessão no shell (1.2213ms)
✔ shell e guarda de rota (117.7511ms)
ℹ tests 29
ℹ suites 5
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 625.6971
```
