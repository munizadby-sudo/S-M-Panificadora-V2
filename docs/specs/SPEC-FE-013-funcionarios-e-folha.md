# SPEC-FE-013 — Funcionários e Folha (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-22
- **Módulo:** `frontend/src/modules/funcionarios`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-BE-013 (contrato de API)
- **PRD de origem:** `PRD-backend-S-M-Panificadora-V2.md`, Seção 4.12 (não há PRD de frontend dedicado — mesma lacuna documentada na SPEC-BE-013, Seção 0)

---

## 1. Objetivo técnico

Especificar a tela de gestão de funcionários e folha: cadastro de funcionário, lançamento de adiantamento e de ocorrências (falta/atestado/hora extra/não cumprimento do trabalho), fechamento/consulta de folha, e impressão do recibo em duas vias (empresa e funcionário). **Tela inteira visível apenas para `admin`** — nenhum outro papel deve sequer ver este módulo no menu (mesma decisão da SPEC-BE-013, Seção 0).

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/funcionarios/index.js
export default {
  id: 'funcionarios',
  label: 'Funcionários',
  icone: 'ti-users',
  permissao: 'admin', // caso especial: o router filtra por permissão de módulo (session.temPermissao), mas
                       // este módulo não tem entrada própria na whitelist de permissões — ver nota abaixo
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```
**Nota de implementação:** como este módulo não usa uma permissão granular (SPEC-BE-013, Seção 0 — é `admin`-only por papel, não por permissão da whitelist), o registro do módulo no router (`index.html`) deve ser condicionado a `getUsuario()?.role === 'admin'`, não a `temPermissao(...)`. Confirmar como o router (SPEC-FE-001) trata esse caso — se `registrarModulo` só aceita filtragem por `permissao`, pode ser necessário registrar o módulo condicionalmente (só chamar `router.registrarModulo(moduloFuncionarios)` quando `role === 'admin'`), em vez de depender do filtro padrão de permissão.

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Cadastro de funcionários
- CRUD simples: nome, cargo, salário base **mensal**, periodicidade (mensal ou quinzenal) e data de admissão. Padeiro e ajudante defaultam para quinzenal (pagamento dia 5 e dia 20). Desativar/reativar, mesmo padrão de Clientes/Produtos (rotulado "Desativar"/"Reativar", nunca "Excluir").
- **Testável:** cadastrar, editar, desativar e reativar um funcionário.

### Passo 2 — Lançamento de adiantamento
- Clique em **Lançar adiantamento** abre a caixa flutuante (mesmo cromo de Novo funcionário). A aba mostra a listagem até o operador pedir o formulário.
- **Testável:** lançar um adiantamento e ver refletido na listagem.

### Passo 3 — Lançamento de ocorrência (falta/atestado/hora extra/não cumprimento)
- Clique em **Nova ocorrência** abre a caixa flutuante. Tipo em `<select>` fixo (nunca texto livre). Listagem na aba.
- **Quando o tipo selecionado for "Atestado", o campo de valor é desabilitado e fixado em R$ 0,00** — reflete a regra de que atestado nunca desconta (SPEC-BE-013, Seção 3.3). Não deixar o operador preencher um valor que o backend vai ignorar/zerar sem avisar.
- **Quando o tipo for "Não cumprimento do trabalho"**, aparece um segundo `<select>` de motivo: não limparam a produção, não limparam a cozinha, não fizeram a produção correta. O valor é um desconto em reais, lançado pelo operador. Entra na folha em linha própria, separado das faltas.
- **Testável:** lançar os quatro tipos e confirmar que atestado nunca aceita valor diferente de zero na própria UI, antes mesmo de chamar a API; não cumprimento exige motivo.

### Passo 4 — Fechamento de folha
- Clique em **Fechar folha** abre a caixa flutuante. Selecionar funcionário e período (`periodo_inicio`/`periodo_fim`), confirmar via `POST /api/folhas` (SPEC-BE-013, Seção 5.6).
- Para funcionário quinzenal, a tela oferece atalhos **1ª quinzena (paga dia 5)** e **2ª quinzena (paga dia 20)** e sugere a quinzena ainda vigente. No fim do mês (depois do dia 20), isso é 16–fim do mês corrente (paga no dia 5 do mês seguinte).
- Para funcionário **mensal** (balconista etc.), ao selecionar já preenche o **mês anterior** (ex.: em 28/08 → 01/07 a 31/07), com atalho **Mês anterior**.
- Exibir o resultado do cálculo (salário base, adiantamentos, faltas, não cumprimento, horas extras, líquido) no próprio modal após fechar — nunca recalculado no frontend, sempre o que o backend devolveu.
- Erro 409 (folha já fechada para o período) exibido como mensagem de negócio clara, não erro técnico.
- **Testável:** fechar uma folha com adiantamento e hora extra lançados, e ver o líquido bater com o esperado.

### Passo 5 — Marcar folha como paga
- Botão "Marcar como paga" por linha da listagem de folhas pendentes, com confirmação explícita (mesmo padrão de ação irreversível-mas-idempotente já usado em outros módulos).
- **Testável:** marcar como paga e ver o status mudar na listagem; clicar de novo (duplo clique) não gera erro.

### Passo 6 — Imprimir folha (2 vias)
- Cada linha da listagem de folhas tem **Imprimir (2 vias)**.
- Um único diálogo de impressão gera **VIA EMPRESA** e **VIA FUNCIONÁRIO** em **A4**, no formato de holerite (cabeçalho da empresa, dados do funcionário, tabela Proventos | Descontos, totais e líquido, declaração de recebimento e duas assinaturas). Reusa `imprimirHtml` (sem `noopener`, logo em data URI).
- Documento interno — não é holerite oficial CLT.
- **Testável:** o HTML gerado contém as duas vias, as duas assinaturas e o detalhe de não cumprimento.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `ListaFuncionarios` / `FormularioFuncionario` | CRUD com soft delete/reativação |
| `FormularioAdiantamento` / `ListaAdiantamentos` | Lançamento e consulta |
| `FormularioOcorrencia` | Tipo fixo, valor desabilitado para atestado, motivo obrigatório para não cumprimento |
| `FormularioFechamentoFolha` / `ListaFolhas` | Seleção de período, exibição do cálculo, marcar como paga, imprimir 2 vias |
| `htmlHolerite` | Recibo A4 estilo holerite, VIA EMPRESA e VIA FUNCIONÁRIO |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `403` (não-admin) | Não deveria ser alcançável — módulo nem aparece no menu para quem não é admin; tratar defensivamente se acontecer |
| `409` — folha já fechada no período | Mensagem de negócio clara, sem permitir novo envio até o operador trocar o período |
| `400` — tipo de ocorrência inválido | Não deveria ser alcançável (select fixo); tratar defensivamente |

---

## 6. Fora de escopo desta SPEC

- Cálculo de encargos trabalhistas (INSS/FGTS) — fora de escopo também no backend (SPEC-BE-013, Seção 0).
- Ponto eletrônico / controle automático de horas — ocorrências são sempre lançamento manual.
- Holerite oficial CLT / PDF assinado digitalmente — o papel impresso é documento interno de duas vias.

---

## 7. Critérios de aceite técnicos

1. Módulo só aparece no menu para usuários com `role === 'admin'`.
2. Campo de valor de uma ocorrência do tipo "Atestado" nunca é editável — sempre R$ 0,00.
3. O líquido exibido após fechar uma folha é sempre o valor devolvido pelo backend, nunca recalculado no frontend.
4. Fechar a mesma folha duas vezes mostra a mensagem de negócio do 409, não trava a tela nem duplica o lançamento.
5. Marcar folha como paga é seguro contra duplo clique (idempotente, sem erro na segunda chamada).
6. Tipo "Não cumprimento do trabalho" exige motivo no select (produção, cozinha ou produção incorreta).
7. Imprimir folha gera HTML com VIA EMPRESA e VIA FUNCIONÁRIO no mesmo documento.
