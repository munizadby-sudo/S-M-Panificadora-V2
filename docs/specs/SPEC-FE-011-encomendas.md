# SPEC-FE-011 — Encomendas (Frontend)

- **Status:** Implementada (Passos 1–7)
- **Data:** 2026-08-22 (atualizada 2026-08-30 — comprovante em 2 vias)
- **Módulo:** `frontend/src/modules/encomendas`
- **Depende de:** SPEC-FE-001 (Fundação), `montarSeletorCliente` (SPEC-FE-009/módulo `clientes`, reaproveitado como componente completo, não só HTML), SPEC-BE-011 (contrato de API)
- **PRD de origem:** `PRD-008-encomendas.md`

---

## 1. Objetivo técnico

Especificar a tela de encomendas: listagem com filtro por status, cadastro/edição com cliente opcional (reaproveitando o seletor de cliente já pronto, com cadastro rápido embutido) e uma lista de itens ao estilo carrinho, mudança de status, e cancelamento sempre rotulado como "cancelar" — nunca "excluir".

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/encomendas/index.js
export default {
  id: 'encomendas',
  label: 'Encomendas',
  icone: 'ti-clipboard-list',
  permissao: 'encomendas',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Listagem com filtro por status
- Consumir `GET /api/encomendas` (SPEC-BE-011, Seção 5.5), com filtro por `status`, período de entrega e cliente.
- Colunas: número, cliente, data de entrega, total, status, sinal.
- Encomendas canceladas (`ativo=0`) só aparecem com o filtro explícito — mesmo padrão de "somente ativas por padrão" já usado em Perdas/Produtos/Clientes.
- **Testável:** ver a listagem carregada de verdade, filtrar por status.

### Passo 2 — Cadastro com cliente opcional
- Usar `montarSeletorCliente` (módulo `clientes`, já pronto) para o vínculo opcional — inclui busca, seleção e cadastro rápido embutido, sem precisar reconstruir nada disso aqui.
- Campos próprios do pedido, sempre preenchidos independente do vínculo: nome do contato, telefone, data de entrega, sinal, observações — pré-preenchidos automaticamente quando um cliente é selecionado no seletor, mas continuam editáveis (é o dado *deste pedido*, não uma cópia travada do cadastro).
- **Testável:** cadastrar uma encomenda com e sem cliente vinculado.

### Passo 3 — Itens do pedido (lista ao estilo carrinho)
- Reaproveitar o padrão de `modules/pdv/carrinho.js` (adicionar produto, remover item, remover último, total local) adaptado para múltiplos produtos com quantidade livre (não incrementa 1 a 1 como o PDV — aqui o operador digita a quantidade do item ao adicionar).
- O total exibido após salvar é sempre o `total` devolvido pelo backend, nunca a soma calculada localmente.
- **Testável:** montar um pedido com 2+ itens, salvar, e ver o total do backend batendo com a soma dos subtotais.

### Passo 4 — Edição substitui todos os itens
- Ao abrir a edição, consultar `GET /api/encomendas/:id` (SPEC-BE-011, Seção 5.5) para carregar o detalhe completo com itens — a listagem paginada não traz itens, só resumo.
- A lista de itens carregada é o ponto de partida — adicionar/remover nela e salvar reenvia a lista inteira (nunca um diff incremental), refletindo a regra do backend (SPEC-BE-011, Seção 4.2).
- **Testável:** editar uma encomenda removendo um item e adicionando outro; confirmar que o item removido não aparece mais depois de salvar.

### Passo 5 — Semáforo de status e finalizar entrega
- Status na linha é um **semáforo** (bolinha + rótulo), nunca `<select>`. Cores: Pendente `--aviso`, Pronto `--sucesso` + dica “Aguardando retirada”, Entregue `--muted` (linha cinza).
- Clique em Pendente envia `PATCH /api/encomendas/:id/status` com `{ status: "pronto" }` — único avanço permitido ao operador.
- Clique em Pronto abre o modal **Finalizar encomenda** (mesmo cromo das outras caixas flutuantes): total, sinal, saldo `max(0, total − sinal)`, formas 1 Dinheiro / 2 Pix / 3 Débito (`cartao`) / 4 Crédito. Confirmar envia `POST /api/encomendas/:id/finalizar`. Sem saldo a receber, só confirma a entrega.
- Linha **Entregue** esconde Editar/Cancelar. Só admin vê **Reabrir** (`PATCH` para `pronto`).
- **Testável:** avançar Pendente → Pronto; entregar com caixa aberto e ver Entregue travado; admin reabrir.

### Passo 6 — Cancelamento (soft delete)
- Botão rotulado **"Cancelar"**, nunca "Excluir" — reflete a correção da SPEC-BE-011 em relação ao V1.
- Exige confirmação explícita antes de executar (modal "Tem certeza? A encomenda continuará no histórico como cancelada.") — mesmo padrão de cautela já usado no estorno de Perdas.
- Submeter via `DELETE /api/encomendas/:id`.
- **Testável:** cancelar uma encomenda e confirmar que ela sai da listagem padrão (ou aparece marcada, dependendo do filtro), continuando consultável com o filtro de inativas.

### Passo 7 — Comprovante térmico em duas vias

Depois de **cadastrar** a encomenda, abre o mesmo box de impressão do PDV, com o título **Imprimir encomenda (2 vias)**. Um único papel: **VIA CLIENTE** (o cliente leva) e **VIA ESTABELECIMENTO** (fica na loja), com corte no meio.

Cada via traz número, cliente, telefone, data de entrega, itens, total, sinal, saldo a pagar e observação. Não é cupom fiscal.

Na lista, **Imprimir** reabre o mesmo comprovante (encomenda ativa ou já entregue). Cancelada não imprime.

Usa `imprimirHtmlEmIframe` — sem aba nova do Chrome.

- **Testável:** `frontend/tests/encomendas/passo-impressao.test.js`.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `ListaEncomendas` | Tabela com filtro por status/período/cliente |
| `FormularioEncomenda` | Cadastro/edição — cliente, dados do pedido, itens |
| `montarSeletorCliente` | Reaproveitado integralmente do módulo `clientes` (SPEC-FE-009) |
| `ItensEncomenda` | Lista de itens ao estilo carrinho, adaptada de `modules/pdv/carrinho.js` para quantidade livre por item |
| `htmlSemaforoStatus` | Bolinha + cor; clique avança Pendente ou abre o receber em Pronto |
| `htmlModalFinalizarEncomenda` | Caixa flutuante para receber o saldo e confirmar entrega |
| `cupom.js` | Comprovante térmico de 2 vias (cliente + loja) |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `400` — itens vazio | Mensagem de negócio clara antes de tentar salvar (validação local espelha a regra, mas o backend é a fonte de verdade) |
| `404` — cliente vinculado não existe mais | Não deveria ser alcançável (seleção vem do seletor); tratar defensivamente |
| `404`/`400` — produto do item inválido | Mensagem de negócio identificando o item, nunca erro técnico genérico |
| `400` — transição de status inválida | Não deveria ser alcançável pelo semáforo; mostrar a mensagem do backend |
| `403` — caixa fechado ao finalizar | Mensagem “Abra o caixa para receber a encomenda.” no modal |
| `403` — encomenda entregue travada | Não deveria ser alcançável (ações ocultas); só admin vê Reabrir |

---

## 6. Fora de escopo desta SPEC

- Notificação automática ao cliente (WhatsApp/SMS) sobre status do pedido.
- Cobrança online do sinal/saldo.
- Reativação de encomenda cancelada — não existe no backend (SPEC-BE-011, Seção 3.1: cancelamento é decisão final, sem toggle).

---

## 7. Critérios de aceite técnicos

1. O total exibido após salvar é sempre o valor devolvido pelo backend, nunca a soma calculada localmente.
2. Cadastrar/editar sem nenhum item é bloqueado antes do envio, com mensagem clara.
3. O botão de cancelamento nunca é rotulado "Excluir", e sempre exige confirmação explícita.
4. Editar uma encomenda e remover um item faz esse item desaparecer de fato após salvar — nunca permanece "fantasma".
5. O seletor de cliente reaproveitado permite cadastro rápido sem sair da tela de encomenda.
6. Cada um dos 6 passos da Seção 3 é individualmente testável no navegador, na ordem descrita.
7. Não existe `<select>` de status na linha; Pendente/Pronto/Entregue aparecem como semáforo.
8. Finalizar entrega nunca cria venda do PDV: o modal chama só `POST /encomendas/:id/finalizar`.
9. Cadastro de encomenda oferece comprovante em 2 vias no mesmo papel; **Imprimir** na lista reabre; impressão no iframe, sem aba nova.
