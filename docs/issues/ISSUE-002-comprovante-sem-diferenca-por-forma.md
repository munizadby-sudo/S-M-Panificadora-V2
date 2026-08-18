# ISSUE-002 — Comprovante impresso de fechamento sem diferença por forma de pagamento

- **Status:** Corrigido (2026-08-16)
- **Data:** 2026-08-16
- **Módulo:** `frontend/src/modules/caixa-turno` (`fechamento.js` → `htmlComprovanteRevisao`, `htmlResumoImprimivel`)
- **Severidade:** Média (o papel omitia informação que a tela já mostrava; dificulta conferência/responsabilização no comprovante físico)
- **Relacionado:** SPEC-FE-003, PRD-004; evidência de QA: tela de resumo lista dinheiro/pix/cartão; impressão (`about:blank`) só trazia o total

---

## 1. Sintoma

Ao clicar **Imprimir comprovante** (box de revisão) ou **Imprimir resumo** (após fechar):

1. A view impressa abria normalmente (após ISSUE-001).
2. A seção **Diferença** mostrava só a classificação (bateu certo/sobra/falta) e o **total**.
3. Na tela, o resumo já exibia diferença por forma: dinheiro, pix e cartão.
4. O papel ficava incompleto em relação à tela.

---

## 2. Causa

`htmlComprovanteRevisao` e `htmlResumoImprimivel` montavam a seção Diferença só com status + `diferenca.total`, sem as linhas `diferenca.dinheiro` / `pix` / `cartao` que o `renderizarResumo` da UI já usava.

---

## 3. Correção aplicada

Nas duas views imprimíveis, a seção **Diferença** passou a listar, no mesmo estilo das seções Esperado/Contado:

- Dinheiro  
- Pix  
- Cartão  
- Total  

Teste: `frontend/tests/caixa-turno/passo3-4.test.js` — *comprovante e resumo imprimíveis detalham diferença por forma*.

Amostra visual gerada em QA: `frontend/tmp/comprovante-fechamento.png` (e HTML correspondente em `frontend/tmp/`).
