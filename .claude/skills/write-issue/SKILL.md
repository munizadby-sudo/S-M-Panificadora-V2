---
name: write-issue
description: Cria ou corrige arquivos ISSUE-XXX em docs/issues/ deste projeto (S-M-Panificadora-V2). Use quando o usuário pedir para documentar um bug, registrar uma correção, abrir uma issue, ou revisar/corrigir o formato de uma issue existente.
---

# Escrever ISSUE

Gera arquivos `docs/issues/ISSUE-XXX-slug.md` no formato canônico deste projeto. Baseado em revisão de código feita por José (2026-08-20/21), que apontou ISSUE-004 e ISSUE-006 como fora do padrão usado pelas demais.

## 1. Antes de escrever

1. Rode `ls docs/issues/` e pegue o maior número `ISSUE-XXX` existente. A nova issue usa o próximo número — nunca reaproveite um número já ocupado, mesmo que a issue antiga pareça "fechada" (isso já causou confusão real: ver nota de processo na ISSUE-004).
2. Escolha um slug curto, em minúsculas, com hífen, descrevendo o sintoma (ex.: `teste-concorrencia-produtos-401`, não o nome da correção).
3. Confira se a issue se relaciona a alguma SPEC (`docs/specs/SPEC-BE-XXX` ou `SPEC-FE-XXX`) ou PRD (`docs/prd/PRD-XXX`) — a maioria referencia pelo menos uma.

## 2. Formato canônico (siga exatamente esta estrutura)

```markdown
# ISSUE-XXX — <Título curto e descritivo do sintoma>

- **Status:** <Aberta | Corrigido (AAAA-MM-DD) | Fechada — resolvida (AAAA-MM-DD)>
- **Data:** AAAA-MM-DD
- **Módulo:** `caminho/do/modulo` (`arquivo.js` → `funcaoRelevante`)
- **Severidade:** <Alta | Média | Baixa> (justificativa breve de impacto)
- **Relacionado:** SPEC-XX-XXX, PRD-XXX; outras evidências (log, print, sessão de QA)

---

## 1. Sintoma

O que o usuário/teste observa, em passos numerados ou lista curta.

---

## 2. Causa

Explicação técnica direta da causa raiz. Se ainda não confirmada, diga isso explicitamente (não invente causa).

---

## 3. Correção aplicada

O que foi mudado, em qual arquivo/função. Se a issue ainda está aberta, use "## 3. Correção proposta" ou omita e adicione uma seção de plano.

---

## 4. Teste permanente (canário)

Arquivo de teste e nome do caso que cobre essa regressão para sempre. Inclua o resultado da suíte **com log bruto colado** (não só o resumo — ver regra abaixo).
```

Seções extras são permitidas quando fazem sentido (numeradas em sequência, cada uma separada por `---`):
- **Nota de processo** — quando algo saiu do combinado (decisão tomada sem confirmação, resumo divergente do log, número de issue reaproveitado etc.). Registre para não repetir.
- **Critério de aceite para fechar esta issue** — checklist `- [ ]` quando a issue ainda não está 100% fechada.
- **Revisão de decisão** — quando uma regra de negócio mudou no meio da correção e precisa de registro de quem aprovou e quando.

## 3. O que NÃO fazer (erros encontrados em ISSUE-004 e ISSUE-006)

- **Não** comece o arquivo com `## Status` ou `## Título` como headers soltos de mesmo nível. O título vai em um único `# ISSUE-XXX — ...` no topo, e Status/Data/Módulo/Severidade/Relacionado vão juntos num bloco de lista (`- **Campo:**`) logo abaixo — não cada um como seção própria.
- **Não** deixe o número da issue e o nome do arquivo divergentes ou dependentes de nota de rodapé explicando a renumeração. Confira o número certo *antes* de escrever (passo 1), não depois.
- **Não** publique o "resumo da suíte" (`70/70`, `90/90`) sem colar o log bruto completo do `npm.cmd test`. Já houve casos reais neste projeto de resumo divergir da execução real (ver ISSUE-001, ISSUE-004).
- **Não** decida e implemente uma mudança de regra de negócio sozinho e documente como se already aprovada — proponha e espere confirmação do dono do produto (ver ISSUE-005, seção 5).

## 4. Checklist final antes de salvar

- [ ] Número da issue confere com o maior existente + 1
- [ ] Nome do arquivo = `ISSUE-XXX-slug-curto.md`
- [ ] `# ISSUE-XXX — Título` como único H1
- [ ] Bloco de metadados (Status/Data/Módulo/Severidade/Relacionado) logo abaixo, como lista
- [ ] Seções numeradas (1. Sintoma, 2. Causa, 3. Correção, 4. Teste) separadas por `---`
- [ ] Log bruto de teste colado se a issue afirma que algo passou
- [ ] Referência a SPEC/PRD relevante, se existir
