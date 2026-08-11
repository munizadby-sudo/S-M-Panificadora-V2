# PRD-004 — Caixa por Turno (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Abertura, banner de status e fechamento de turno de caixa
- **Referência/legado:** `S-M-Panificadora` (V1) — `modal-abrir-caixa`, `modal-fechar-caixa`, `caixa-turno-banner`, `resumo-fin`, `resumo-linhas`, `resumo-diferenca-total`, `pgto-bars`, `hourly-chart` em `index.html`; `frontend/js/caixaTurno.js`
- **Depende de:** PRD-001, PRD-002. É pré-requisito funcional do PRD-003 (venda exige turno aberto).

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

- Modal de abertura de turno: campos de fundo em espécie e moedas, total calculado automaticamente, período do turno exibido (definido no momento da abertura — ver correção abaixo).
- Bloqueio de abertura de novo turno se já existir um turno aberto no mesmo período.
- Banner de status do turno visível em toda tela relevante (pelo menos PDV/Vendas), indicando aberto/fechado e período atual.
- **Prévia de fechamento:** antes de confirmar o fechamento, a tela deve mostrar o valor esperado por forma de pagamento (consumindo o endpoint de prévia do backend — PRD do backend, Seção 4.7), permitindo ao operador conferir o dinheiro em caixa contra o esperado antes de confirmar.
- Modal de fechamento: captura do valor contado por forma de pagamento, campo de observação, e exibição do resumo com a diferença (sobra/falta/bateu certo) antes da confirmação definitiva.
- Após fechamento confirmado, tela de resumo do turno com detalhamento por forma de pagamento e diferença total.

---

## 4. Regras herdadas do V1 (mantidas)

- Captura de fundo em espécie e moedas na abertura.
- Resumo visual de diferença por forma de pagamento e total no fechamento.
- Bloqueio de segundo turno aberto no mesmo período.

---

## 5. Correções em relação ao V1

- **Período do turno fixado na abertura:** a tela deve exibir e tratar o período como algo definido no momento em que o turno foi aberto, não recalculado dinamicamente a cada tela — reflete a correção equivalente no backend (PRD do backend, Seção 4.7), evitando que um turno "mude de período" entre abertura e fechamento.
- **Prévia de fechamento antes da confirmação** é um requisito novo em relação ao V1 (que não tinha esse endpoint) — reduz erro de digitação e retrabalho de fechamento incorreto.
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
