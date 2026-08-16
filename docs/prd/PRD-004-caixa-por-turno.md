# PRD-004 — Caixa por Turno (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Abertura, banner de status e fechamento de turno de caixa
- **Referência/legado:** `S-M-Panificadora` (V1) — `modal-abrir-caixa`, `modal-fechar-caixa`, `caixa-turno-banner`, `resumo-fin`, `resumo-linhas`, `resumo-diferenca-total`, `pgto-bars`, `hourly-chart` em `index.html`; `frontend/js/caixaTurno.js`
- **Depende de:** PRD-001, PRD-002, PRD-014 (Configurações — fornece o valor padrão de fundo de troco usado no pré-preenchimento da abertura). É pré-requisito funcional do PRD-003 (venda exige turno aberto).

---

## 1. Objetivo

Permitir abrir o turno com o fundo de caixa inicial, acompanhar o status do turno durante o expediente, e fechar o turno com conferência de valores por forma de pagamento, exibindo a diferença apurada de forma clara antes da confirmação final.

---

## 2. Contexto (V1)

- Modal de abertura de turno captura fundo em espécie e em moedas (`abertura-especie`, `abertura-moedas`), com total calculado (`abertura-total`) e rótulo do período detectado (`abertura-periodo-label`).
- Banner fixo mostra o status do turno (`caixa-turno-banner`) — visível também na tela de vendas.
- Modal de fechamento captura o valor contado por forma de pagamento (`fechamento-dinheiro`, `fechamento-moedas`, `fechamento-pix`, `fechamento-cartao`) e observação (`fechamento-obs`), mostrando um resumo antes da confirmação (`fechamento-resumo`).
- Tela dedicada de resumo financeiro do turno com linhas por forma de pagamento (`resumo-linhas`), diferença total (`resumo-diferenca-total`), gráfico de vendas por forma de pagamento (`pgto-bars`) e por hora (`hourly-chart`).

---

## 3. Requisitos funcionais

- Modal de abertura de turno: campos de fundo em espécie e moedas **pré-preenchidos com o valor padrão configurado da loja** (ex.: R$ 40 em espécie, R$ 10 em moedas — ver PRD-014, Seção 3), mas sempre editáveis. O pré-preenchimento é uma sugestão para agilizar, não substitui a contagem física — a balconista confere o dinheiro na gaveta e ajusta o campo se o valor real for diferente do sugerido antes de confirmar a abertura.
- Total calculado automaticamente, período do turno exibido (definido no momento da abertura — ver correção abaixo).
- Bloqueio de abertura de novo turno se já existir um turno aberto no mesmo período.
- Banner de status do turno visível em toda tela relevante (pelo menos PDV/Vendas), indicando aberto/fechado e período atual.
- **Prévia de fechamento:** antes de confirmar o fechamento, a tela deve mostrar o valor esperado por forma de pagamento (consumindo o endpoint de prévia do backend — PRD do backend, Seção 4.7), permitindo ao operador conferir o dinheiro em caixa contra o esperado antes de confirmar.
- **Impressão da prévia de fechamento:** a tela deve oferecer uma ação de imprimir a prévia (esperado por forma de pagamento, data/hora, turno) antes da confirmação final. Esse comprovante serve como registro de que a conferência foi feita naquele momento, com aquele valor esperado — importante porque a responsabilidade por uma eventual falta de caixa é de quem contou e confirmou o fechamento daquele turno.
- **Impressão como pré-requisito do fechamento:** o botão "Confirmar fechamento" só fica habilitado depois que a prévia for impressa pelo menos uma vez naquele fechamento. Isso trava a *ação de fechar*, não a navegação da tela — o operador pode sair e voltar livremente; o que fica bloqueado é confirmar sem ter impresso.
- **Caminho de exceção (impressora indisponível):** se a impressão falhar ou não houver impressora configurada, a tela oferece a opção "Prosseguir sem impressão" — visível somente depois de uma tentativa de impressão sem sucesso, nunca como atalho padrão. Ao usar essa opção, o fechamento é confirmado normalmente, mas o backend registra na auditoria que ocorreu **sem comprovante impresso** (ver SPEC-BE-002, a detalhar). Isso evita travar o fechamento do turno por causa de impressora sem tinta/papel, sem perder a rastreabilidade de quando a exceção foi usada.
- Modal de fechamento: captura do valor contado por forma de pagamento, campo de observação, e exibição do resumo com a diferença (sobra/falta/bateu certo) antes da confirmação definitiva.
- Após fechamento confirmado, tela de resumo do turno com detalhamento por forma de pagamento e diferença total, com opção de impressão do resumo final (mesma lógica de registro/responsabilização da prévia).

---

## 4. Regras herdadas do V1 (mantidas)

- Captura de fundo em espécie e moedas na abertura.
- Resumo visual de diferença por forma de pagamento e total no fechamento.
- Bloqueio de segundo turno aberto no mesmo período.

---

## 5. Correções em relação ao V1

- **Período do turno fixado na abertura:** a tela deve exibir e tratar o período como algo definido no momento em que o turno foi aberto, não recalculado dinamicamente a cada tela — reflete a correção equivalente no backend (PRD do backend, Seção 4.7), evitando que um turno "mude de período" entre abertura e fechamento.
- **Prévia de fechamento antes da confirmação** é um requisito novo em relação ao V1 (que não tinha esse endpoint) — reduz erro de digitação e retrabalho de fechamento incorreto.
- **Impressão da prévia e do resumo final** é um requisito novo em relação ao V1 — não existia como conceito. Motivo de negócio: se o caixa fechar com falta, o comprovante mostra o esperado e o contado no momento exato da conferência feita pela balconista responsável por aquele turno, dando respaldo tanto pra ela (prova de que contou e assinou embaixo daquele valor) quanto pra gestão (identificar em qual turno e com quem a diferença aconteceu).
- **Pré-preenchimento do fundo na abertura** é um requisito novo em relação ao V1 — o V1 exigia digitar os valores do zero todo dia, mesmo sendo sempre o mesmo fundo fixo (ex.: R$ 40/R$ 10). A contagem física continua obrigatória; o que muda é que o ponto de partida já vem preenchido, exigindo só confirmação ou ajuste.
- **Decisão de UX deliberada:** avaliamos travar a tela inteira até a impressão (não permitir sair) e descartamos — se a impressora falhar sem papel/tinta, isso prenderia o operador sem conseguir nem fechar o caixa nem sair da tela, travando o fechamento do turno inteiro. A trava correta é sobre a *ação de confirmar fechamento*, com uma saída de exceção auditada (ver Seção 3), não sobre a navegação.
- Gráficos (`pgto-bars`, `hourly-chart`) devem refletir sempre os dados do turno atual (por `aberto_em`), nunca misturar com dados do dia inteiro — consistente com a correção de fonte única de verdade no backend.

---

## 6. Fora de escopo desta fase

- Pausa de turno (estado "Em Pausa" mencionado no documento de escopo financeiro do V1) — não confirmado como necessidade operacional atual; puramente aberto/fechado nesta fase.
- Múltiplos caixas simultâneos no mesmo período (fora de escopo também no backend).

---

## 7. Critérios de aceite

1. Não é possível abrir um segundo turno no mesmo período com um já aberto.
2. O banner de status reflete corretamente aberto/fechado e período em toda tela relevante.
3. A prévia de fechamento mostra o esperado por forma de pagamento antes de qualquer confirmação.
4. O resumo pós-fechamento mostra a diferença corretamente classificada (sobra/falta/bateu certo).
5. Os gráficos do turno usam exclusivamente os dados do turno atual, nunca do dia inteiro.
6. O modal de abertura vem com fundo em espécie e moedas pré-preenchidos com o valor padrão configurado, mas o campo continua editável e a abertura só é confirmada após ação explícita do operador (nunca abre automaticamente sem confirmação).
7. É possível imprimir a prévia de fechamento antes de confirmar, e o resumo final após confirmar — ambos com data/hora, turno e valores exibidos no comprovante.
8. O botão "Confirmar fechamento" fica desabilitado até que a prévia tenha sido impressa pelo menos uma vez naquele fechamento; sair e voltar da tela não é bloqueado.
9. "Prosseguir sem impressão" só aparece depois de uma tentativa de impressão sem sucesso, nunca antes; usá-lo confirma o fechamento normalmente e registra a exceção na auditoria (sem comprovante impresso).
