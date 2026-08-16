# ADR-002 — Defaults de domínio para especificação do backend

- **Status:** Aceita
- **Data:** 2026-08-12
- **Autor:** Adby Muniz (com apoio de IA)
- **Contexto do documento:** três pontos ficaram marcados como "a decidir" no PRD do backend (`PRD-backend-S-M-Panificadora-V2.md`, Seções 4.4, 4.6 e 4.9). Como cada um atravessa mais de um módulo, ficam registrados aqui em vez de dentro de um único PRD.

---

## Contexto

Ao montar a ordem de especificação técnica (SPECs) do backend, três regras de negócio precisavam estar fechadas antes de módulos que dependem delas (Vendas, Estoque, Encomendas) poderem ser especificados sem ambiguidade. As três foram decididas em conjunto, porque a decisão de uma afeta o desenho da outra.

---

## Decisão 1 — Estoque mínimo é informativo, não bloqueia venda

O campo `mínimo` (SPEC-004, a criar) existe apenas para alerta visual na tela de Estoque (PRD-006 frontend). Ele **nunca** impede que o caso de uso `CreateSale` confirme uma venda — mesmo com o saldo abaixo do mínimo configurado, a venda segue normalmente, desde que haja saldo suficiente para aquele item específico.

**Motivo:** bloquear por mínimo criaria uma segunda condição de bloqueio de venda além de "sem estoque disponível" (PRD backend §4.6), aumentando a chance de a balconista ficar travada numa venda por um parâmetro que é só de planejamento, não de disponibilidade real.

---

## Decisão 2 — Venda de turno fechado não é cancelada diretamente; vira uma correção pendente

**Regra:** uma vez que o turno em que a venda ocorreu está fechado, essa venda não pode mais ser cancelada/estornada diretamente. Em vez disso, existe uma ação separada — **solicitar correção**.

### Como funciona
1. Ao tentar cancelar uma venda cujo turno já está fechado, o sistema recusa o cancelamento direto e oferece "Solicitar correção".
2. Isso cria um registro de **Correção Pendente**: venda original, motivo, quem solicitou, quando, status `pendente`.
3. **Na abertura de qualquer turno seguinte**, se existir correção pendente, o sistema exibe um aviso destacado antes ou junto da abertura — a balconista/gestão fica ciente de que há algo aguardando resolução.
4. A correção é resolvida por um `admin`, e o ajuste (estorno de valor, e reversão de estoque se aplicável) é lançado **no turno atual, aberto no momento da resolução** — nunca retroativo, nunca reabrindo ou alterando o turno antigo já fechado.
5. O lançamento de ajuste referencia a venda original (rastreabilidade), mas com data/turno de hoje.

### Motivo
Isso resolve exatamente a distorção do V1 descrita no PRD backend §4.6: lá, o estorno de uma venda antiga ia para o fluxo do dia da ação, bagunçando a conciliação do turno vigente sem deixar claro de onde veio a diferença. Aqui, a diferença aparece explicitamente como "ajuste de correção" no turno atual, e o turno antigo — já fechado, já impresso (PRD-004) — nunca é alterado, preservando a integridade do comprovante que já foi entregue/assinado.

### Consequência de design
Isso exige uma nova entidade de domínio, `CorrecaoPendente`, e um novo passo no caso de uso `AbrirCaixa` (SPEC-BE-002): verificar se há correções pendentes e retornar esse aviso na resposta de abertura.

---

## Decisão 3 — Encomenda não debita estoque, nem na criação nem na entrega

**Regra:** encomendas ficam completamente fora do controle de estoque nesta fase — nem reservam na criação, nem debitam na entrega.

**Motivo:** produtos encomendados muitas vezes não são de produção diária regular (itens especiais, sob consulta) — forçar um vínculo de estoque criaria bloqueios artificiais para itens que a padaria não mantém em saldo todo dia. Encomenda, no V2, é só controle de pedido/status/cliente, sem efeito colateral em Estoque.

**Reavaliação futura:** se a padaria passar a usar encomenda para itens de produção regular (que competem pelo mesmo saldo do PDV), essa decisão precisa ser revisitada — o registro fica aqui para isso não ser esquecido.

---

## Consequências

- SPEC-004 (Estoque) especifica `mínimo` como campo somente informativo, sem lógica de bloqueio.
- SPEC-007 (Vendas, a criar) especifica duas ações distintas para venda de turno fechado: `CancelSale` (turno aberto) e `SolicitarCorrecaoVenda` (turno fechado) — nunca a mesma rota fazendo os dois.
- SPEC-BE-002 (Caixa por Turno) ganha um passo adicional no caso de uso `AbrirCaixa`: checar `CorrecaoPendente` e retornar aviso.
- SPEC-010 (Encomendas, a criar) não terá nenhuma dependência de `EstoqueRepository`.

---

## Alternativas consideradas e descartadas

- **Permitir cancelamento direto de venda de turno fechado** (comportamento do V1): descartado por já ter causado a distorção de conciliação identificada no legado.
- **Encomenda reservando estoque na criação**: descartado nesta fase por criar bloqueio artificial em itens de produção irregular; pode ser revisitado.
