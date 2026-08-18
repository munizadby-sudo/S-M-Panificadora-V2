# SPEC-FE-006 — Perdas (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-17
- **Módulo:** `frontend/src/modules/perdas`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-FE-004 (`SeletorCategoria`, reaproveitado), SPEC-BE-006 (contrato de API)
- **PRD de origem:** `PRD-010-perdas.md`

> Lembrete de contexto: este módulo **nunca existiu no V1** — a regra de negócio já existia no backend legado, mas sem tela nenhuma. É por isso que a SPEC-BE-006 corrige o problema de fundo (perda não debitava estoque) e esta SPEC-FE-006 é o que torna essa correção usável de verdade.

---

## 1. Objetivo técnico

Especificar o registro de perdas pela UI: formulário simples com motivo fixo (nunca texto livre), custo sempre vindo do backend, e feedback imediato do novo saldo de estoque após o registro.

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/perdas/index.js
export default {
  id: 'perdas',
  label: 'Perdas',
  icone: 'ti-trash',
  permissao: 'perdas',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Listagem de perdas (somente leitura)
- Consumir `GET /api/perdas` (SPEC-BE-006, Seção 5.2), com filtro por período (data início/fim), produto e motivo.
- Colunas: produto, data, quantidade, motivo, custo calculado, usuário responsável.
- **Testável:** ver a listagem carregada de verdade, filtrar por período e por produto.

### Passo 2 — Formulário de registro de perda
- Campos: produto (busca/seleção — reaproveitar padrão de busca de produto já usado em outros módulos, se existir; senão, um campo de busca simples consumindo `GET /api/produtos`), quantidade, motivo (**`<select>` fixo com as 4 opções da whitelist — nunca campo de texto livre**), data (padrão: hoje).
- **Prévia de custo no frontend** (produto.custo × quantidade, calculado localmente só para feedback visual instantâneo enquanto o usuário digita) — mas o valor exibido **depois de salvar** é sempre o `custo_calculado` que volta na resposta do backend, nunca o valor calculado localmente persistido como se fosse o oficial.
- Submeter via `POST /api/perdas` (SPEC-BE-006, Seção 5.1).
- **Testável:** registrar uma perda de verdade e ver o custo calculado (vindo do backend) aparecer corretamente no formulário/confirmação.

### Passo 3 — Feedback do novo saldo após registro
- Depois de uma perda ser registrada com sucesso, consultar `GET /api/estoque?produto_id=X&data=Y` (SPEC-BE-005, Seção 5.1) para o mesmo produto/data e exibir o **novo saldo disponível** na confirmação — não deixar o usuário sem saber se o estoque realmente foi afetado.
- **Testável:** registrar uma perda e ver, na mesma tela, a confirmação mostrando o saldo disponível já atualizado (sem precisar navegar manualmente até a tela de Estoque para conferir).

### Passo 4 — Estorno de perda (somente admin)
- Botão "Estornar" visível **somente para usuários `admin`** (reflete a restrição da SPEC-BE-006, Seção 4.2) — usuário com permissão `perdas` mas não-admin não vê essa ação.
- Exige confirmação explícita antes de executar (modal "Tem certeza? Isso reverte o estoque desta perda.") — nunca ação de um clique só, dado que mexe em estoque histórico.
- Submeter via `DELETE /api/perdas/:id`.
- **Testável:** como admin, estornar uma perda e confirmar que ela some da listagem padrão (ou aparece marcada como estornada, dependendo do filtro), e que o saldo de estoque volta ao valor anterior.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `ListaPerdas` | Tabela com filtros de período/produto/motivo |
| `FormularioPerda` | Cadastro com motivo fixo e prévia de custo |
| `SeletorProduto` | Busca/seleção de produto (novo componente — avaliar se reaproveita algo de `modules/produtos`) |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `400` — motivo fora da whitelist | Não deveria ser alcançável (select fixo), tratar defensivamente |
| `400` — quantidade ≤ 0 | Mensagem inline no campo |
| `400` — estoque insuficiente | Mensagem de negócio clara: *"Estoque insuficiente para registrar essa perda."* — nunca erro técnico genérico |
| `404` — produto não existe | Não deveria ser alcançável (seleção vem de produtos reais) |

---

## 6. Fora de escopo desta SPEC

- Relatório de perdas por causa/tendência (curva de motivos mais frequentes) — fica para o módulo de Relatórios, se for priorizado.

---

## 7. Critérios de aceite técnicos

1. O campo `motivo` nunca aceita texto livre — sempre uma das 4 opções fixas.
2. O custo exibido após salvar é sempre o valor devolvido pelo backend, nunca o calculado localmente.
3. A confirmação de perda registrada mostra o saldo de estoque já atualizado, sem exigir navegação manual.
4. O botão "Estornar" só aparece para usuários `admin`.
5. Estornar sempre exige confirmação explícita antes de executar.
6. Cada um dos 4 passos da Seção 3 é individualmente testável no navegador, na ordem descrita.
