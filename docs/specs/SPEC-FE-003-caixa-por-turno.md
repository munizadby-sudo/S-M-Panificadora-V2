# SPEC-FE-003 — Caixa por Turno (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-13
- **Módulo:** `frontend/src/modules/caixa-turno`
- **Depende de:** SPEC-FE-001 (Fundação — `core/api.js`, `session.js`, `router.js`), SPEC-FE-002 (Autenticação — sessão válida), SPEC-BE-002 (contrato de API que este módulo consome), SPEC-BE-003 (Configurações — fundo de troco padrão, a especificar)
- **PRD de origem:** `PRD-004-caixa-por-turno.md`
- **Pré-requisito de:** SPEC-FE-004 (PDV/Vendas) — o PDV consome o estado de turno deste módulo antes de liberar venda.

---

## 1. Objetivo técnico

Especificar a implementação do módulo de Caixa por Turno no frontend: abertura com fundo pré-preenchido, banner de status consumido por outros módulos (principalmente PDV), fechamento com contagem primeiro + conferência/impressão no final, e exibição de correções pendentes na abertura.

> **Revisão de UX (2026-08-16):** a ordem anterior (imprimir prévia → contar → confirmar) exigia botões demais e invertia o fluxo mental da balconista. A ordem correta é **contar → ver esperado na tela → confirmar → box de pré-visualização/impressão → fechar de verdade**. Ver Passos 3–4 e PRD-004. Bug conhecido de impressão: `docs/issues/ISSUE-001-impressao-previa-caixa-em-branco.md`.

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

### Passo 3 — Contagem + esperado na mesma tela (sem impressão ainda)
- Botão **"Fechar caixa"** abre a tela de fechamento (não um modal intermediário só de prévia).
- Ao abrir essa tela, consumir `GET /api/caixa-turno/preview-fechamento` (SPEC-BE-002, Seção 6.3) e **mostrar os valores esperados na própria tela** (dinheiro / pix / cartão), somente leitura — referência automática para a contagem.
- Formulário de **contagem manual**: dinheiro, moedas, pix, cartão + observação.
- Conforme o operador digita, a UI pode (opcional, recomendado) mostrar a diferença provisória contado − esperado — ainda **sem** chamar `POST /fechar`.
- Nesta etapa **não** há botão "Imprimir prévia" nem "Prosseguir sem impressão". Um único CTA principal: **"Continuar"** / **"Revisar fechamento"** (habilitado quando os campos obrigatórios da contagem estiverem preenchidos).
- **Testável:** com turno aberto, clicar Fechar caixa → ver esperado + campos de contagem; digitar valores; o botão Continuar só libera com contagem válida; ainda não existe chamada a `/fechar`.

### Passo 4 — Box de revisão + impressão + fechamento definitivo
- Ao continuar, abrir um **box/modal de revisão** com:
  - esperado (da prévia),
  - contado (digitado),
  - diferença e classificação provisória (bateu certo / sobra / falta),
  - texto claro pedindo para **imprimir o comprovante** antes de fechar.
- No box: botão **"Imprimir"** (comprovante com esperado + contado + diferença + turno/data). A trava de negócio permanece: o botão **"Confirmar e fechar"** só habilita depois de impressão bem-sucedida **ou** do caminho de exceção.
- **"Prosseguir sem impressão"** só aparece após tentativa de impressão sem sucesso — nunca como atalho padrão; envia `sem_impressao: true` na auditoria (SPEC-BE-002).
- Só então submeter `POST /api/caixa-turno/fechar` com `turno_id` (de `estado.js`), valores contados e `sem_impressao`. Resposta com `idempotente: true` = sucesso normal.
- Após sucesso: tela de resumo do turno (diferença definitiva) **somente na tela** — sem segundo botão de impressão. O comprovante já foi impresso no box de revisão.
- **Testável:** fluxo ponta a ponta com poucos cliques; impressão não abre `about:blank` vazio (ver ISSUE-001); fechar duas vezes o mesmo `turno_id` continua idempotente.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `BannerTurno` | Exibe status aberto/fechado + período; usado no shell e reaproveitado no PDV |
| `ModalAberturaCaixa` | Formulário de abertura com pré-preenchimento |
| `AvisoCorrecoesPendentes` | Lista as correções pendentes retornadas na abertura, não bloqueante |
| `TelaContagemFechamento` | Contagem manual + esperado automático na mesma tela (Passo 3) |
| `BoxRevisaoFechamento` | Modal/box com pré-visualização, impressão e confirmação final (Passo 4) |
| `ComprovanteFechamentoImprimivel` | HTML imprimível (esperado + contado + diferença) — corrigir ISSUE-001 |
| `ResumoFechamento` | Exibe diferença por forma de pagamento e total após o POST (somente tela; impressão já ocorreu na revisão) |

---

## 5. Tratamento de erro

- `TurnoJaAbertoError` / `PeriodoJaRegistradoError` (SPEC-BE-002, Seção 3.3) chegam via `ApiError` (SPEC-FE-001, Seção 4.4) — exibir mensagem de negócio no modal de abertura, sem fechar o modal.
- `NenhumTurnoAbertoError` ao tentar abrir a prévia de fechamento sem turno aberto — não deveria ser alcançável pela UI (botão "Fechar caixa" só aparece com turno aberto), mas deve ser tratado defensivamente mesmo assim.

---

## 6. Critérios de aceite técnicos

1. Nenhum outro módulo (especialmente PDV) chama `GET /api/caixa-turno/status` diretamente — todos passam por `estado.js`.
2. O botão "Confirmar e fechar" (no box de revisão) é comprovadamente inacessível antes de uma impressão bem-sucedida ou do caminho de exceção ser explicitamente acionado; a tela de contagem não exige impressão.
3. `correcoes_pendentes` aparece na tela de abertura sempre que o backend retornar a lista não vazia, sem bloquear a abertura.
4. O banner de status reflete o estado real do turno imediatamente após abrir/fechar, sem exigir recarregar a página.
5. Cada um dos 4 passos da Seção 3 é individualmente testável no navegador, na ordem descrita, sem exigir os passos seguintes implementados.
