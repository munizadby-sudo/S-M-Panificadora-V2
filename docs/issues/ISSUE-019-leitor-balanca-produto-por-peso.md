# ISSUE-019 — PDV não reconhecia etiqueta da balança nem vendia produto por peso

- **Status:** Corrigido (2026-09-12)
- **Data:** 2026-09-12
- **Módulo:** `backend/src/modules/products/domain/Produto.js`, `backend/src/infrastructure/database/db.js`, `backend/src/modules/settings/domain/chaves.js`, `frontend/src/modules/pdv` (`leitor-balanca.js` novo, `carrinho.js`, `index.js`), `frontend/src/modules/produtos` (`modal-produto.js`, `validacao.js`, `index.js`)
- **Severidade:** Média — sem isso, todo produto vendido por peso (queijo, frios) precisava ser lançado na mão, item por item, sem leitor
- **Relacionado:** SPEC-BE-004 §2.2/§3.1/§5.2/§5.3 (atualizadas), SPEC-FE-004 Passo 5 (novo), SPEC-FE-007 §11.6 (novo); item 6 de `docs/depois-do-teste.md`

---

## 1. Sintoma

1. O cadastro de produto não tinha como marcar um item como "vendido por peso" nem guardar o código (PLU) que a etiqueta da balança imprime.
2. O PDV não reconhecia o código de barras da etiqueta — passar o leitor só jogava o número no campo de busca por texto, sem achar nada.
3. Não havia como o estoque de um produto controlar por kg em vez de por unidade.

---

## 2. Causa

Nunca existiu modelagem pra isso: `Produto` só tinha `preco`/`custo`/`ativo`, sem tipo de estoque nem PLU. O contrato de `POST /api/vendas` só aceitava `quantidade` inteira incrementada 1 a 1 no PDV (ISSUE-018 resolveu a parte "digitar a quantidade"; faltava a parte "a balança informar a quantidade sozinha"). Sem uma etiqueta real da balança na mesa, não dava pra saber o formato do código de barras — o item ficou propositalmente congelado até isso aparecer (`docs/depois-do-teste.md`, decisão de 2026-09-12).

---

## 3. Correção aplicada

**Etiqueta real decodificada (Filizola Platina, conferida em 2026-09-12):** código de barras EAN-13 = prefixo `20` (2 dígitos) + código do produto/PLU (5) + valor total em centavos (5) + dígito verificador EAN-13 padrão. Confirmado matematicamente com a etiqueta do Queijo Mussarela (`2000001010341` → PLU `00001`, R$ 10,34 = 0,220kg × R$ 47,00/kg — dígito verificador bate). **A etiqueta traz o valor já calculado, nunca o peso puro.**

**Cadastro (`Produto.js`):** novos campos `tipoEstoque` (`'unidade'` padrão, ou `'peso'`) e `codigoBalanca` (5 dígitos, obrigatório só em `'peso'`, proibido em `'unidade'`). Novas exceções `TipoEstoqueInvalidoError`, `CodigoBalancaInvalidoError`, `CodigoBalancaDuplicadoError` (409, índice único global). Coluna nova migrada de forma idempotente (`garantirColunasBalanca`, `SHOW COLUMNS`/`ALTER TABLE` — sem tocar no que já existe).

**Perfil de balança:** nova chave pública de configuração `perfil_balanca` (padrão `'filizola'`) — trocar de marca de balança é trocar essa chave, sem mexer no PDV.

**PDV (`leitor-balanca.js`, novo):** `decodificarCodigoBalanca(codigo, perfil)` — valida 13 dígitos, prefixo do perfil e dígito verificador EAN-13; `null` em qualquer divergência (nunca lança erro). `pesoDoCodigoBalanca(valorCentavos, precoDoCadastro)` deriva o peso dividindo o valor da etiqueta pelo preço/kg já cadastrado — **nunca calcula preço na hora do scan**, só o cadastro manda no preço (decisão do item 6). Um `Enter` no campo de busca com exatamente 13 dígitos é interceptado antes da busca por texto de sempre; decodificado e casado com `codigo_balanca` de `estado.produtos` (já carregado, sem chamada extra à API), o item entra no carrinho com `adicionarAoCarrinho(carrinho, produto, peso)` — a mesma função do carrinho ganhou um terceiro parâmetro de quantidade explícita (reaproveitado pelo ISSUE-018). Código que não decodifica ou PLU sem produto cadastrado: aviso "Não reconheci esse código da balança. Lance o item na mão." — nunca trava a tela.

**Cadastro de produto (frontend):** modal ganhou seletor "Estoque controlado por" (unidade/peso) e campo de código da balança, visível só em peso. Trocar o tipo de um produto já existente exige informar o **novo saldo** no tipo novo (nunca recalcula sozinho — 40 pães não viram 40 kg); ao salvar, primeiro grava o produto, depois ajusta o estoque via `PUT /api/estoque/:produtoId` já existente. Trocar pra unidade sempre limpa o PLU no payload, mesmo que o campo tenha ficado com texto na tela.

**Falha parcial tratada:** `PUT /api/estoque` exige a permissão `estoque`, separada de `produtos` — se um operador tiver uma sem a outra, o tipo troca mas o ajuste de saldo pode falhar. Tratado explicitamente: a tela não finge que nada mudou, avisa "Tipo de estoque trocado, mas não foi possível ajustar o saldo. Peça a um admin para acertar em Estoque."

---

## 4. Teste permanente (canário)

Backend — `backend/tests/products/dominio.test.js`, `backend/tests/products/produtos.http.test.js`:

```
▶ domínio Produto — tipo de estoque e código da balança (item 6, docs/depois-do-teste.md)
  ✔ padrão é unidade, sem código de balança (1.2579ms)
  ✔ produto por peso exige código de balança com 5 dígitos (1.7398ms)
  ✔ produto por unidade não pode ter código de balança (0.8216ms)
  ✔ tipo de estoque fora da whitelist é rejeitado (0.7943ms)
✔ domínio Produto — tipo de estoque e código da balança (item 6, docs/depois-do-teste.md) (5.8235ms)
▶ schema produtos e categorias
  ✔ aplicarSchemaProdutos cria unicidade de nome por categoria, inclusive inativos (4.7351ms)
  ✔ aplicarSchemaProdutos garante tipo_estoque e codigo_balanca (item 6) (3.5295ms)
✔ schema produtos e categorias (8.8731ms)
▶ HTTP /api/produtos — tipo de estoque e código da balança (item 6, docs/depois-do-teste.md)
  ✔ cria produto por peso com código de balança e rejeita código duplicado (64.2497ms)
  ✔ produto por unidade rejeita código de balança; peso sem código de 5 dígitos é 400 (50.3374ms)
  ✔ trocar de unidade pra peso via PUT exige e grava o novo código (59.7781ms)
✔ HTTP /api/produtos — tipo de estoque e código da balança (item 6, docs/depois-do-teste.md) (175.4245ms)
ℹ tests 15
ℹ suites 6
ℹ pass 15
ℹ fail 0
```

Suíte completa do backend (`npm test`): **222/222** passando.

Frontend — `frontend/tests/pdv/leitor-balanca.test.js`, `frontend/tests/produtos/balanca.test.js`:

```
▶ Leitor de balança (item 6, docs/depois-do-teste.md)
  ✔ decodifica a etiqueta real da Filizola: PLU e valor batem (5.4455ms)
  ✔ peso derivado do valor ÷ preço/kg do cadastro bate com a etiqueta (0,220kg) (0.8466ms)
  ✔ dígito verificador errado não decodifica (0.4623ms)
  ✔ prefixo fora do perfil configurado não decodifica (0.4491ms)
  ✔ menos ou mais de 13 dígitos não decodifica (0.4309ms)
  ✔ texto que não é só dígitos não decodifica (0.3646ms)
  ✔ pesoDoCodigoBalanca sem preço/kg válido no cadastro não quebra, devolve null (0.8228ms)
✔ Leitor de balança (item 6, docs/depois-do-teste.md) (14.3446ms)
▶ Carrinho recebe peso da balança (adicionarAoCarrinho com quantidade explícita)
  ✔ adiciona com o peso decodificado, não 1 unidade (1.4544ms)
  ✔ escanear o mesmo produto duas vezes soma os pesos, não incrementa 1 (0.9701ms)
  ✔ sem quantidade explícita continua incrementando 1 (unidade, comportamento de sempre) (3.1698ms)
✔ Carrinho recebe peso da balança (adicionarAoCarrinho com quantidade explícita) (6.6396ms)
▶ PDV liga a leitura da balança no Enter da busca (13 dígitos)
  ✔ index.js decodifica antes de tratar como busca de texto (0.984ms)
  ✔ código não reconhecido avisa e não quebra (item 6: "não reconheci") (0.5198ms)
  ✔ carrega o perfil de balança da configuração pública ao montar (0.4841ms)
✔ PDV liga a leitura da balança no Enter da busca (13 dígitos) (2.6093ms)
▶ Produto por peso e código da balança (item 6, docs/depois-do-teste.md)
  ✔ validarProduto: padrão é unidade sem exigir código (4.1323ms)
  ✔ validarProduto: peso exige código de 5 dígitos (1.3061ms)
  ✔ validarProduto: trocar pra unidade sempre limpa o código, mesmo se veio preenchido (0.6229ms)
  ✔ htmlModalProduto: unidade esconde o campo de código da balança (1.4854ms)
  ✔ htmlModalProduto: peso mostra o campo de código já preenchido (0.8481ms)
  ✔ htmlModalProduto: trocandoTipo mostra o aviso de acertar o saldo na mão (0.8177ms)
  ✔ htmlModalProduto: guarda o tipo original no form pra saber se está trocando (0.6844ms)
✔ Produto por peso e código da balança (item 6, docs/depois-do-teste.md) (15.6159ms)
ℹ tests 21
ℹ suites 4
ℹ pass 21
ℹ fail 0
```

Suíte completa do frontend (`npm test`): **380/380** passando. Suíte `cd demo && npm run testar`: 15/15 (só a falha já registrada e sem relação, ver Seção 5).

**Validação manual no PDV real da loja (2026-09-12):** cadastrado "Queijo Mussarela" (peso, PLU `00001`, R$ 47,00/kg — dados reais da etiqueta fotografada) pela tela de admin; confirmado no banco de produção (`tipo_estoque='peso'`, `codigo_balanca='00001'`) e na resposta real de `GET /api/produtos`. **Não foi possível testar o scan completo ao vivo** (abrir turno → escanear → vender) porque os dois períodos do dia (manhã e tarde) já estavam fechados no momento do teste, e reabrir um turno fechado no banco de produção pra isso seria contornar uma regra de negócio real — não foi feito. A decodificação, o cálculo de peso e a integração com o carrinho estão cobertos pelos 21 testes automatizados acima, usando o código de barras real da etiqueta.

---

## 5. Nota de processo

O fluxo completo de scan-ao-vivo (abrir turno → ler etiqueta → vender → conferir cupom) fica pendente de validação manual na loja, no próximo turno disponível — não é um teste automatizado que substitua isso, é o mesmo cuidado que já foi tomado no ISSUE-017 e ISSUE-018 (venda de teste + estorno), só que não coube nesta sessão por causa do horário.

A falha de `cd demo && npm run testar` ("SPEC-FE-003 — fechar o caixa: ... próximo clique no banner volta à abertura") que aparece de vez em quando **não tem relação com este item** — é o ISSUE-021 (regra de reabertura de turno no ambiente de teste da demo, confirmada correta na aplicação real).
