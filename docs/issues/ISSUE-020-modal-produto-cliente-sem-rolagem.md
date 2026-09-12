# ISSUE-020 — Modal de produto/cliente cortado, sem rolagem, em telas menores

- **Status:** Corrigido (2026-09-12)
- **Data:** 2026-09-12
- **Módulo:** `frontend/index.html` (`.produtos-modal-caixa`, `.clientes-modal-caixa`)
- **Severidade:** Média — no Chrome real do usuário (não maximizado), o modal "Editar produto" ficava cortado no meio do formulário, sem `Salvar`/`Cancelar` visíveis nem jeito de rolar até eles
- **Relacionado:** SPEC-FE-004 Passo 5 (campos novos do item 6 que deixaram o formulário mais alto); print real do usuário em 2026-09-12

---

## 1. Sintoma

1. No Chrome real (não no preview interno), abrir **Editar produto** num produto com os campos novos de peso/balança (item 6, ISSUE-019) mostrava o modal cortado logo depois de **Ícone** / **Estoque controlado por**.
2. Não havia barra de rolagem nem no modal nem na página — o restante do formulário (código da balança, novo saldo, **Salvar**, **Cancelar**) ficava inacessível.
3. Reportado pelo usuário com print da tela real da loja.

---

## 2. Causa

`.produtos-modal-caixa` / `.clientes-modal-caixa` (`frontend/index.html`) nunca tiveram `max-height` nem `overflow-y` — o modal só crescia com o conteúdo, sem limite. Isso já não era ideal antes, mas só virou sintoma visível quando o item 6 (2026-09-12) acrescentou três campos novos ao formulário de produto (tipo de estoque, código da balança, novo saldo), deixando o formulário alto o bastante pra estourar a altura de uma janela do Chrome não maximizada. O modal de Caixa (`.caixa-turno-modal-caixa`) já tinha `max-height: calc(100vh - 2rem)` + `overflow: auto` desde antes — só nunca foi replicado pros modais de produto/cliente.

---

## 3. Correção aplicada

Mesma regra do modal de Caixa, aplicada a `.produtos-modal-caixa` e `.clientes-modal-caixa`: `max-height: calc(100vh - 2rem); overflow-y: auto;`. Confirmado ao vivo (`getComputedStyle` no navegador real): `scrollHeight` (916px) maior que `clientHeight` (572px após o limite) — a barra de rolagem aparece e o formulário inteiro, incluindo **Salvar**/**Cancelar**, fica alcançável.

---

## 4. Teste permanente (canário)

Regra puramente visual (CSS de layout) — não há assertiva de `getComputedStyle`/`max-height` na suíte automatizada do frontend; a garantia é a suíte completa não regredir (nenhuma mudança de estrutura HTML) mais a verificação manual abaixo. Se este comportamento quebrar de novo, o critério de aceite é o mesmo do item 4 desta issue.

Suíte completa do frontend (`npm test`) depois da mudança: **380/380** passando (nenhum teste toca CSS de modal).

**Validação manual no navegador real do usuário:** editar produto com os campos do item 6 visíveis, rolar o modal até **Salvar**/**Cancelar**, confirmado funcionando.

---

## 5. Nota de processo

Nenhuma SPEC (nem SPEC-FE-004, nem SPEC-FE-015 — o guia visual do sistema) documentava a regra "modal tem `max-height`/rolagem" como padrão obrigatório; o modal de Caixa só tinha isso por implementação avulsa, não por regra escrita. Vale considerar formalizar isso em SPEC-FE-015 como regra de todo modal do sistema, pra não repetir esse mesmo corte em um modal futuro — não feito agora, fora do escopo desta correção pontual.
