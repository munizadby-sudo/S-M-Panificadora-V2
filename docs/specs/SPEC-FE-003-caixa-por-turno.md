# SPEC-FE-003 — Caixa por Turno (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-13
- **Módulo:** `frontend/src/modules/caixa-turno`
- **Depende de:** SPEC-FE-001 (Fundação — `core/api.js`, `session.js`, `router.js`), SPEC-FE-002 (Autenticação — sessão válida), SPEC-BE-002 (contrato de API que este módulo consome), SPEC-BE-003 (Configurações — fundo de troco padrão, a especificar)
- **PRD de origem:** `PRD-004-caixa-por-turno.md`
- **Pré-requisito de:** SPEC-FE-004 (PDV/Vendas) — o PDV consome o estado de turno deste módulo antes de liberar venda.

---

## 1. Objetivo técnico

Especificar a implementação do módulo de Caixa por Turno no frontend: abertura com fundo pré-preenchido, banner de status consumido por outros módulos (principalmente PDV), prévia de fechamento com impressão obrigatória antes de confirmar, e exibição de correções pendentes na abertura.

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/caixa-turno/index.js
export default {
  id: 'caixa-turno',
  label: 'Caixa',
  icone: 'ti-cash-banknote',
  permissao: 'caixa',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

**Estado exportado para outros módulos** — este é o ponto mais importante da SPEC, porque o PDV (SPEC-FE-004) depende dele:
```js
// modules/caixa-turno/estado.js
export async function getTurnoAtual()      // consulta GET /api/caixa-turno/status, cacheado em memória
export function turnoEstaAberto()          // síncrono, lê do cache já carregado
export function onMudancaDeTurno(callback) // observer — PDV se inscreve pra reagir a abertura/fechamento
```
Nenhum outro módulo deve chamar `GET /api/caixa-turno/status` diretamente — sempre through `estado.js`, para evitar múltiplas fontes de verdade sobre "o turno está aberto?" dentro do frontend.

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

> Respeitando a regra de ordem incremental testável: cada passo abaixo deve rodar e ser verificável no navegador antes do próximo começar.

### Passo 1 — Banner de status (somente leitura)
- Implementar `estado.js` com `getTurnoAtual()` consumindo `GET /api/caixa-turno/status` (SPEC-BE-002, Seção 6.1).
- Renderizar o banner (aberto/fechado, período) no shell.
- **Testável:** abrir o sistema logado, ver o banner mostrando "Caixa fechado" corretamente, sem nenhuma ação de abrir/fechar ainda implementada.

### Passo 2 — Abertura de turno com pré-preenchimento
- Buscar o fundo de troco padrão (endpoint de Configurações, SPEC-BE-003 — a aguardar; se ainda não existir, usar valor fixo temporário documentado como `TODO`).
- Modal de abertura com campos pré-preenchidos e editáveis (PRD-004, Seção 3).
- Submeter para `POST /api/caixa-turno/abrir` (SPEC-BE-002, Seção 6.2).
- Exibir os `correcoes_pendentes` retornados como aviso destacado, não bloqueante (ADR-002, Decisão 2).
- **Testável:** abrir um turno de verdade, ver o banner mudar para "aberto", confirmar que valores pré-preenchidos aparecem e são editáveis antes de confirmar.

### Passo 3 — Prévia de fechamento com impressão obrigatória
- Botão "Fechar caixa" abre a prévia, consumindo `GET /api/caixa-turno/preview-fechamento` (SPEC-BE-002, Seção 6.3).
- Renderizar o comprovante de prévia (esperado por forma de pagamento) em formato imprimível (`window.print()` de uma view dedicada, ou geração de PDF simples — decisão de implementação livre, desde que produza algo fisicamente imprimível).
- Botão "Confirmar fechamento" **desabilitado** até o botão "Imprimir prévia" ser acionado ao menos uma vez nesta sessão de fechamento (PRD-004, Seção 3 e critério de aceite 8).
- Botão "Prosseguir sem impressão" só aparece após uma tentativa de impressão que falhe (ex.: `window.print()` cancelado/erro de driver) — nunca visível por padrão.
- **Testável:** tentar clicar "Confirmar fechamento" sem imprimir — deve estar desabilitado; imprimir — botão libera.

### Passo 4 — Confirmação de fechamento e resumo
- Modal de fechamento captura valores contados por forma de pagamento + observação.
- Submeter para `POST /api/caixa-turno/fechar` (SPEC-BE-002, Seção 6.4), incluindo `turno_id` (obtido de `estado.js`, nunca deduzido) e `sem_impressao: true/false` conforme o caminho usado no Passo 3. Se a resposta vier com `idempotente: true` (ex.: reenvio por falha de rede), tratar como sucesso normal, exibindo o mesmo resumo — nunca como erro.
- Exibir resumo pós-fechamento com diferença classificada (bateu certo/sobra/falta), com opção de imprimir o resumo final.
- **Testável:** fechar um turno de ponta a ponta e ver o resumo com a diferença correta.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `BannerTurno` | Exibe status aberto/fechado + período; usado no shell e reaproveitado no PDV |
| `ModalAberturaCaixa` | Formulário de abertura com pré-preenchimento |
| `AvisoCorrecoesPendentes` | Lista as correções pendentes retornadas na abertura, não bloqueante |
| `PreviaFechamentoImprimivel` | View dedicada para impressão da prévia (Passo 3) |
| `ModalFechamentoCaixa` | Formulário de contagem + observação |
| `ResumoFechamento` | Exibe diferença por forma de pagamento e total, com opção de impressão |

---

## 5. Tratamento de erro

- `TurnoJaAbertoError` / `PeriodoJaRegistradoError` (SPEC-BE-002, Seção 3.3) chegam via `ApiError` (SPEC-FE-001, Seção 4.4) — exibir mensagem de negócio no modal de abertura, sem fechar o modal.
- `NenhumTurnoAbertoError` ao tentar abrir a prévia de fechamento sem turno aberto — não deveria ser alcançável pela UI (botão "Fechar caixa" só aparece com turno aberto), mas deve ser tratado defensivamente mesmo assim.

---

## 6. Critérios de aceite técnicos

1. Nenhum outro módulo (especialmente PDV) chama `GET /api/caixa-turno/status` diretamente — todos passam por `estado.js`.
2. O botão "Confirmar fechamento" é comprovadamente inacessível (desabilitado) antes de uma impressão bem-sucedida ou do caminho de exceção ser explicitamente acionado.
3. `correcoes_pendentes` aparece na tela de abertura sempre que o backend retornar a lista não vazia, sem bloquear a abertura.
4. O banner de status reflete o estado real do turno imediatamente após abrir/fechar, sem exigir recarregar a página.
5. Cada um dos 4 passos da Seção 3 é individualmente testável no navegador, na ordem descrita, sem exigir os passos seguintes implementados.
