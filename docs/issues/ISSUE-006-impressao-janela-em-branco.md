# ISSUE-006 — Janela de impressão abria em branco (about:blank vazio) antes de escrever o comprovante

- **Status:** Corrigido — descoberto de forma incidental pelo Cursor durante a implementação de outra tarefa (Estoque), não reportado por nós.
- **Data:** não informada nos registros originais — a confirmar com o Cursor.
- **Módulo:** `frontend/src/modules/caixa-turno`, provavelmente a função `imprimirHtml` usada na impressão da prévia de fechamento (SPEC-FE-003, Passo 3)
- **Severidade:** Média — impacto operacional potencial alto (impressão de comprovante de fechamento de caixa), mas o sintoma exato visível ao usuário e o alcance real do bug ainda não estão confirmados; descoberta foi incidental via log de teste, não relato de campo.
- **Relacionado:** SPEC-FE-003 (Caixa por Turno), Passo 3; nota de numeração compartilhada com ISSUE-004/ISSUE-005 (ver Seção 5)

---

## 1. Sintoma

A confirmar com o Cursor — ainda não preenchido com os detalhes reais. O único indício disponível é o nome do teste que apareceu no log da suíte:

```
▶ Passo 3 — impressão sem about:blank vazio
  ✔ imprimirHtml abre janela sem noopener e escreve o HTML
```

O nome sugere que a função `imprimirHtml` (usada para gerar o comprovante impresso de fechamento de caixa) tinha um problema em que a janela de impressão (`window.open` para `about:blank`) abria **vazia**, sem o conteúdo do comprovante escrito nela.

Pendências a confirmar diretamente com o Cursor antes de fechar esta issue:
- Qual era o sintoma exato visível pro usuário (impressão saía em branco? erro no console? nada acontecia?).
- Desde quando esse bug existia (introduzido em qual SPEC/commit).
- Se afeta só a prévia de fechamento, ou também o comprovante de fechamento e a impressão do Estoque/outros módulos que usam a mesma função.

---

## 2. Causa

Ainda não confirmada formalmente. Hipótese, a partir do nome do teste e da correção aplicada: condição de corrida entre abrir a janela e escrever o HTML nela, ou uso incorreto de `noopener`/`noreferrer` impedindo a referência à janela recém-aberta.

---

## 3. Correção aplicada

Função `imprimirHtml` ajustada para abrir a janela **sem `noopener`** (permitindo manter a referência) e escrever o HTML corretamente antes de disparar a impressão.

---

## 4. Teste permanente (canário)

`frontend/tests/caixa-turno/...` (caminho exato do arquivo a confirmar) — caso "imprimirHtml abre janela sem noopener e escreve o HTML". Log bruto completo da execução ainda não coletado para esta issue especificamente.

---

## 5. Nota de processo

Mesma observação da ISSUE-005: esta correção foi feita e documentada — inclusive rotulada inicialmente com o número errado, "ISSUE-001", que já pertencia a outro bug (impressão em branco na prévia de fechamento) — sem passar por confirmação prévia. Por ser uma correção técnica de baixo risco (não é regra de negócio, não muda comportamento visível além de corrigir o bug), não exige a mesma cautela da ISSUE-005, mas o hábito de avisar antes o gestor, mesmo para correções pequenas, continua valendo.

---

## 6. Critério de aceite para fechar esta issue

- [ ] Sintoma exato visível ao usuário confirmado com o Cursor
- [ ] Causa raiz técnica confirmada (não apenas hipótese)
- [ ] Confirmado desde quando o bug existia (SPEC/commit de origem)
- [ ] Confirmado se afeta só a prévia de fechamento ou também o comprovante final e outros módulos (ex.: Estoque) que usam `imprimirHtml`
- [ ] Confirmado que não existe nenhum outro lugar do sistema com o mesmo padrão de bug (`window.open` + escrita de HTML sem garantir a janela pronta)
- [ ] Caminho exato do arquivo de teste confirmado e log bruto de `npm.cmd test` colado
