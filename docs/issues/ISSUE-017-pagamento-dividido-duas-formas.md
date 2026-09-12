# ISSUE-017 — PDV só aceitava uma forma de pagamento por venda

- **Status:** Corrigido (2026-09-12)
- **Data:** 2026-09-12
- **Módulo:** `backend/src/modules/sales` (`domain/Venda.js`, `application/CreateSale.js`, `application/CancelSale.js`, `application/ResolverCorrecaoPendente.js`, `infrastructure/MySQLVendaRepository.js`), `backend/src/infrastructure/database/db.js`, `backend/src/modules/reports/application/RelatorioVendas.js`, `frontend/src/modules/pdv` (`pagamento.js`, `index.js`, `api.js`, `cupom.js`)
- **Severidade:** Média no balcão — cliente que paga parte em dinheiro e parte no cartão/PIX não tinha como fazer isso numa venda só; o operador tinha que lançar duas vendas separadas, distorcendo número de vendas e ticket médio
- **Relacionado:** SPEC-BE-007 §2.2.1 e §5.1 (atualizadas), SPEC-FE-007 §11.4 (atualizada); item 9 de `docs/depois-do-teste.md`

---

## 1. Sintoma

1. No modal "Tipo de pagamento" do PDV, só dava para escolher **uma** forma (Dinheiro, Pix, Débito ou Crédito) para o total inteiro da venda.
2. Cliente que queria pagar, por exemplo, R$ 6,00 em dinheiro e R$ 4,00 no cartão não tinha como fazer isso numa venda só — o operador precisava lançar duas vendas separadas (uma de R$ 6,00 dinheiro, outra de R$ 4,00 cartão), o que gera dois números de venda para um único atendimento e distorce `numero_vendas`/`ticket_medio` nos relatórios.

---

## 2. Causa

A entidade `Venda` (`backend/src/modules/sales/domain/Venda.js`) sempre modelou pagamento como um único campo `formaPagamento`, validado contra a whitelist `FORMAS_PAGAMENTO = ['dinheiro','pix','cartao','credito']`. O contrato de `POST /api/vendas` (SPEC-BE-007 §5.1) só previa `forma_pagamento` (string), e o `fluxo_caixa` só recebia um lançamento por venda. Não existia modelagem nem para persistir, nem para exibir, mais de uma forma na mesma venda.

---

## 3. Correção aplicada

**Modelo de dados:** nova tabela `venda_pagamentos` (`venda_id`, `forma_pagamento`, `valor`) — 1 ou 2 linhas por venda, soma sempre igual ao `total`. `vendas.forma_pagamento` continua com as 4 formas reais (guarda a 1ª linha, valor legado/informativo); a entidade `Venda`, em memória, deriva `formaPagamento = 'misto'` quando há 2 linhas (`derivarFormaPagamento`, nunca lido da coluna do banco).

**Domínio (`Venda.js`):** `montarPagamentos({ formaPagamento, pagamentos, total })` aceita o `pagamentos` novo ou cai no `forma_pagamento` singular de sempre (retrocompatível). Nova exceção `PagamentosInvalidosError` (400, `PAGAMENTOS_INVALIDOS`): mais de 2 linhas, formas repetidas, valor ≤ 0, ou soma diferente do total calculado a partir dos itens.

**Aplicação:** `CreateSale` lança **um `fluxo_caixa` por linha de pagamento**, não um lançamento único com o total — assim o fechamento de turno (que já agrupa `fluxo_caixa` por `forma`, SPEC-BE-002) soma cada forma certo sem precisar saber o que é "misto", sem nenhuma mudança nesse cálculo. `CancelSale` e `ResolverCorrecaoPendente` estornam/ajustam cada forma separadamente, no mesmo padrão.

**Relatórios:** `RelatorioVendas` ganhou `listarPagamentosConfirmadosNoPeriodo` (novo método de repositório) — o "por forma de pagamento" agora soma direto de `venda_pagamentos`, não do `forma_pagamento` por item (que não sabe dividir e lançaria tudo num balde "misto").

**Frontend:** modal de pagamento ganhou checkbox **Dividir em duas formas** (`pagamento.js` → `htmlSeletorFormaPagamento`/`htmlDivisaoPagamento`). Marcado: some o painel de recebido/troco (não existe troco em venda dividida — as duas partes são valores exatos), aparece campo de valor para a 1ª forma e botões com as outras três (nunca a já escolhida) para a 2ª. O valor da 2ª forma é sempre `total − valor da 1ª` (nunca digitado), garantindo que a soma bate sem o operador fazer conta. Digitar o valor atualiza o restante e o botão **sem re-renderizar o painel** (`atualizarRestanteNoDom`) — perder foco no meio da digitação seria o mesmo bug do ISSUE-008. `POST /api/vendas` passa a enviar `pagamentos: [...]` em vez de `forma_pagamento` quando dividido. Backend devolve `forma_pagamento: "misto"`; `confirmacao.js`, `lista-turno.js` e `modal-estorno-venda.js` mostram o rótulo **Misto**. O cupom não fiscal imprime uma linha por forma, com o valor de cada uma.

**Sem tecla dedicada:** `1`/`2`/`3`/`4` continuam escolhendo só a 1ª forma; a 2ª forma e o checkbox são mouse/Tab, por ora.

---

## 4. Teste permanente (canário)

Backend — `backend/tests/sales/dominio.test.js`, `backend/tests/sales/vendas.http.test.js`, `backend/tests/reports/relatorios.test.js` (44 testes, 9 novos deste item):

```
▶ casos de uso — relatórios
  ✔ RelatorioVendas agrega total, formas, produtos e KPIs (2.7236ms)
  ✔ RelatorioVendas: venda dividida soma cada forma separado, não "misto" (item 9) (0.9075ms)
  ✔ RelatorioVendas: período vazio zera KPIs sem NaN (0.8251ms)
  ✔ RelatorioVendas: numero_vendas conta vendas distintas, não itens (1.3552ms)
  ...
✔ casos de uso — relatórios (61.4289ms)
▶ domínio Venda
  ✔ exige pelo menos um item (4.0698ms)
  ✔ total é sempre a soma dos subtotais — nunca aceita total externo (1.6013ms)
  ✔ toda venda pertence a um turno_id (0.5931ms)
  ✔ forma de pagamento deve ser da whitelist (0.6464ms)
  ✔ item calcula subtotal como quantidade × preco_unitario snapshot (0.4293ms)
  ✔ cancelar marca status cancelada (0.5789ms)
✔ domínio Venda (12.2497ms)
▶ domínio Venda — pagamentos divididos (item 9, docs/depois-do-teste.md)
  ✔ duas formas cuja soma bate com o total gera forma_pagamento "misto" (3.1708ms)
  ✔ soma diferente do total lança PagamentosInvalidosError (1.5568ms)
  ✔ as duas formas não podem ser iguais (0.7629ms)
  ✔ mais de duas formas não é aceito (3.0331ms)
  ✔ valor zero ou negativo numa das formas é inválido (0.6332ms)
  ✔ sem pagamentos, cai no formaPagamento único (compatibilidade) (0.4179ms)
✔ domínio Venda — pagamentos divididos (item 9, docs/depois-do-teste.md) (10.9144ms)
▶ HTTP /api/vendas
  ✔ POST com turno aberto debita estoque e lança fluxo_caixa (447.9743ms)
  ✔ POST sem turno aberto retorna 403 CAIXA_FECHADO sem escrever nada (89.2929ms)
  ✔ POST com estoque insuficiente não persiste venda nem débitos parciais (107.3955ms)
  ✔ GET /api/vendas é paginado com limite padrão 20 (94.967ms)
  ✔ DELETE cancela diretamente com turno aberto (67.2754ms)
  ✔ DELETE na mesma venda cancelada é idempotente e não lança segundo estorno (100.877ms)
  ✔ DELETE com turno fechado cria correcao_pendente; resolver ajusta turno atual (98.5984ms)
  ✔ POST com pagamentos dividido em duas formas lança um fluxo_caixa por forma (item 9) (61.6688ms)
  ✔ POST com soma dos pagamentos diferente do total retorna 400 e não escreve nada (62.1451ms)
  ✔ DELETE de venda dividida estorna as duas formas separadamente (77.6491ms)
✔ HTTP /api/vendas (1213.0977ms)
ℹ tests 44
ℹ suites 8
ℹ pass 44
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2656.0325
```

Suíte completa do backend (`npm test`): **214/214** passando.

Frontend — `frontend/tests/pdv/pagamento-dividido.test.js`:

```
▶ Pagamento dividido em duas formas (item 9, docs/depois-do-teste.md)
  ✔ calcularValorRestante devolve o total menos a 1ª forma (2.5136ms)
  ✔ podeConfirmarVenda: dividido precisa de 2ª forma diferente e valor entre 0 e o total (0.8902ms)
  ✔ dividir não exige recebido/troco de dinheiro, mesmo se a 1ª forma for dinheiro (0.4355ms)
  ✔ htmlSeletorFormaPagamento: sem dividir, não mostra o bloco de divisão (73.5482ms)
  ✔ htmlSeletorFormaPagamento: dividido mostra valor da 1ª forma e botões da 2ª (sem a já escolhida) (1.6265ms)
  ✔ htmlSeletorFormaPagamento: dividido com valor inválido desabilita confirmar (0.8696ms)
✔ Pagamento dividido em duas formas (item 9, docs/depois-do-teste.md) (83.6769ms)
ℹ tests 6
ℹ suites 1
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 350.8013
```

Suíte completa do frontend (`npm test`): **352/352** passando.

**Validação manual no PDV real da loja** (2026-09-12, turno de teste aberto e fechado de propósito): venda de R$ 2,50 (Água 250ml) dividida em Dinheiro R$ 1,50 + Pix R$ 1,00 — banner "Venda confirmada... Forma: Misto", cupom com as duas linhas certas, lista do turno mostrando "Misto". Venda estornada em seguida (`Nº 391 estornada`) e turno fechado com "Bateu certo" para não deixar resíduo nos números reais da loja.

---

## 5. Nota de processo

No caminho, a suíte `backend/tests/sales/vendas.concorrencia.test.js` passou a **travar indefinidamente** (sem erro, sem timeout) depois que a tabela `venda_pagamentos` entrou no schema. Investigado a fundo: não era deadlock do MySQL (nenhuma transação nem lock ativo durante a trava) — era o hook `after()` do teste rodando `DELETE FROM vendas` sem antes limpar `venda_pagamentos`, batendo em `ER_ROW_IS_REFERENCED_2` (FK). Esse erro, não tratado, deixava conexões do pool do `mysql2` sem `.release()`, e o pool (limite 10) ficava esgotado para o resto da suíte — parecendo um travamento sem causa. Corrigido adicionando `DELETE FROM venda_pagamentos` na ordem certa do cleanup, antes de `venda_itens`/`vendas`.

Também foi cogitada e **descartada** uma migração `ALTER TABLE vendas MODIFY COLUMN forma_pagamento ENUM(..., 'misto')` no banco — trocada pela abordagem atual (coluna do banco continua com as 4 formas reais, "misto" só existe em memória) depois que essa alteração, testada isoladamente, mostrou risco real de lock de metadata (`lock_wait_timeout` default de 1 ano no MySQL) sob os testes de concorrência que já mexem na tabela `vendas` ao mesmo tempo.
