## Título
Janela de impressão abria em branco (about:blank vazio) antes de escrever o comprovante

## Módulo
`frontend/src/modules/caixa-turno` — provavelmente a função de impressão da prévia de fechamento (SPEC-FE-003, Passo 3)

## Status
Corrigido pelo Cursor durante a implementação de outra tarefa (Estoque) — **descoberto de forma incidental**, não fomos nós que reportamos. Documentando agora para não ficar sem rastro.

## Descrição (a confirmar com o Cursor — preencher com os detalhes reais)

O teste que apareceu no log da suíte:
```
▶ Passo 3 — impressão sem about:blank vazio
  ✔ imprimirHtml abre janela sem noopener e escreve o HTML
```

Nome sugere que a função `imprimirHtml` (usada para gerar o comprovante impresso de fechamento de caixa) tinha um problema em que a janela de impressão (`window.open` para `about:blank`) abria **vazia**, sem o conteúdo do comprovante escrito nela — possivelmente uma condição de corrida entre abrir a janela e escrever o HTML nela, ou uso incorreto de `noopener`/`noreferrer` impedindo a referência à janela aberta.

**Preencher aqui, depois de perguntar ao Cursor:**
- [ ] Qual era o sintoma exato visível pro usuário (impressão saía em branco? erro no console? nada acontecia?)
- [ ] Causa raiz técnica (o que especificamente estava errado no código)
- [ ] Desde quando esse bug existia (introduzido em qual SPEC/commit)
- [ ] Se afeta só a prévia de fechamento, ou também o comprovante de fechamento e a impressão do Estoque/outros módulos que usam a mesma função

## Correção aplicada

Função `imprimirHtml` ajustada para abrir a janela **sem `noopener`** (permitindo manter a referência) e escrever o HTML corretamente antes de disparar a impressão.

## Teste permanente

`frontend/tests/caixa-turno/...` (arquivo exato a confirmar) — `imprimirHtml abre janela sem noopener e escreve o HTML`.

## Nota de processo

Mesma observação do ISSUE-005: esta correção foi feita e documentada (rotulada até com o número errado, "ISSUE-001", que já pertence a outro bug) sem passar por confirmação prévia. Como é uma correção técnica de baixo risco (não é regra de negócio, não muda comportamento visível além de corrigir o bug), não exige a mesma cautela do ISSUE-005 — mas o hábito de **avisar antes gestor**, mesmo pra correções pequenas, continua valendo.

## Critério de aceite para fechar esta issue

- [ ] Detalhes da causa raiz preenchidos acima
- [ ] Confirmado que não existe nenhum outro lugar do sistema com o mesmo padrão de bug (`window.open` + escrita de HTML sem garantir a janela pronta)
- [ ] Renomear o teste/issue para não usar o número "ISSUE-001" (já ocupado pelo bug de concorrência em Produtos)
