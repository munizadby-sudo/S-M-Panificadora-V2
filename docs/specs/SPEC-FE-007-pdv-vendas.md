# SPEC-FE-007 — PDV / Vendas (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `frontend/src/modules/pdv`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-FE-003 (`estado.js` do Caixa por Turno — consumido, nunca reimplementado), SPEC-FE-004/005 (produto/estoque, referência de padrão), SPEC-BE-007 (contrato de API)
- **PRD de origem:** `PRD-003-pdv-vendas.md`

---

## 1. Objetivo técnico

Especificar a tela mais usada do sistema: grade de produtos, carrinho, confirmação de venda — sempre bloqueada corretamente quando o caixa está fechado, sempre traduzindo os erros técnicos do backend (`CAIXA_FECHADO`, estoque insuficiente) em mensagens que uma balconista entende sem pensar.

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

**Regra de acoplamento (crítica):** este módulo **nunca** chama `GET /api/caixa-turno/status` diretamente — sempre consulta o estado através de `modules/caixa-turno/estado.js` (SPEC-FE-003, Seção 2). É esse acoplamento que a SPEC-FE-003 já previu ao ser escrita.

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Banner de status + bloqueio quando caixa fechado
- Reaproveitar o `BannerTurno` (SPEC-FE-003, componente já existente) no topo da tela de PDV.
- Se `estado.turnoEstaAberto() === false`: a tela inteira exibe um aviso claro ("Abra o caixa para começar a vender", com atalho para a tela de Caixa) **no lugar** da grade de produtos — não deixa o operador chegar até o carrinho pra só então descobrir que não pode vender.
- **Testável:** abrir a tela de PDV sem turno aberto e ver o bloqueio antes de qualquer tentativa de montar carrinho; abrir com turno aberto e ver a grade normalmente.

### Passo 2 — Grade de produtos e carrinho
- Grade de produtos ativos (`GET /api/produtos`, reaproveitando o padrão de busca/filtro por categoria de `modules/produtos`), com busca rápida.
- Carrinho local (em memória, no módulo — não persiste no backend até confirmar): adicionar item, remover item, remover último, limpar tudo.
- Total do carrinho calculado localmente **apenas para exibição em tempo real** — o valor que efetivamente conta é sempre o que o backend recalcula na confirmação (SPEC-BE-007, Seção 4.1, Passo 8).
- **Testável:** montar um carrinho com vários itens, ver o total local somando certo, remover itens e ver recalcular.

### Passo 3 — Seleção de forma de pagamento e confirmação
- Seleção de forma de pagamento (`dinheiro`, `pix`, `cartao`, `credito` — mesma whitelist da SPEC-BE-007, Seção 2.2) antes de habilitar "Confirmar venda".
- Cálculo de troco quando `dinheiro` (campo "valor recebido", troco = recebido − total).
- Submeter via `POST /api/vendas` (SPEC-BE-007, Seção 5.1).
- **Tratamento de erro por código, não por mensagem genérica:**
  - `403 CAIXA_FECHADO` → não deveria ser alcançável (Passo 1 já bloqueia), mas se acontecer (ex.: turno fechado por outra estação enquanto essa tela estava aberta), mostrar "O caixa foi fechado. Recarregando status..." e atualizar o banner.
  - `400` estoque insuficiente → identifica o item específico do carrinho e mostra "Estoque insuficiente para [nome do produto]", sem derrubar o carrinho inteiro — o operador pode remover só aquele item e tentar de novo.
- **Testável:** confirmar uma venda de verdade com sucesso; depois, tentar vender mais do que o estoque de um produto tem, e ver a mensagem específica daquele item.

### Passo 4 — Confirmação de sucesso e limpeza
- Após venda confirmada: exibir número da venda (`numero`, retornado pelo backend), total, forma de pagamento, e limpar o carrinho automaticamente para a próxima venda.
- **Testável:** confirmar uma venda e ver o carrinho voltar vazio, pronto para a próxima, sem exigir recarregar a página.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `BannerTurno` | Reaproveitado de `modules/caixa-turno` (SPEC-FE-003) |
| `AvisoCaixaFechado` | Tela de bloqueio quando não há turno aberto |
| `GradeProdutos` | Grade com busca, reaproveitando padrão de `modules/produtos` |
| `Carrinho` | Lista de itens, total local, ações de adicionar/remover |
| `SeletorFormaPagamento` | Escolha da forma + cálculo de troco |
| `ConfirmacaoVenda` | Exibe número/total após sucesso |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `403 CAIXA_FECHADO` | Mensagem de negócio + atualização do banner, nunca erro técnico cru |
| `400` — carrinho vazio | Não deveria ser alcançável (botão de confirmar desabilitado com carrinho vazio) |
| `400` — estoque insuficiente | Identifica o item específico, mensagem de negócio, carrinho não é descartado |

---

## 6. Fora de escopo desta SPEC

- Pagamento via TEF integrado — depende do contrato de integração TEF do backend (PRD backend §4.16), ainda não especificado.
- Emissão de cupom fiscal — depende da integração fiscal (PRD backend §4.17).
- Tela de resolução de correções pendentes (`POST /api/vendas/correcoes/:id/resolver`) — essa ação é de `admin`, provavelmente pertence a uma tela de gestão separada (a definir: pode virar parte da tela de Caixa por Turno, já que é lá que o aviso de correção pendente aparece na abertura).

---

## 7. Critérios de aceite técnicos

1. Nenhuma chamada a `GET /api/caixa-turno/status` acontece diretamente neste módulo — sempre via `estado.js`.
2. Com turno fechado, a grade de produtos e o carrinho nunca chegam a ser montados — o bloqueio aparece primeiro.
3. Erro de estoque insuficiente identifica o produto específico, nunca é uma mensagem genérica cobrindo o carrinho inteiro.
4. O total exibido após confirmar é sempre o valor devolvido pelo backend, nunca o somado localmente antes de enviar.
5. Cada um dos 4 passos da Seção 3 é individualmente testável no navegador, na ordem descrita.
