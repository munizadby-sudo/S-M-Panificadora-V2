# ISSUE-021 — Suíte `demo/` não bloqueia reabrir turno no mesmo período

- **Status:** Aberta — investigação não concluída (2026-09-12)
- **Data:** 2026-09-12
- **Módulo:** `demo/specs/navegador.test.js` (teste `SPEC-FE-003 — fechar o caixa`), possivelmente `backend/src/modules/cash-register/domain/DeterminadorDePeriodo.js` ou `backend/tests/helpers/MemoriaCaixaTurnoRepository.js`
- **Severidade:** Baixa — a regra de negócio real (bloquear reabertura do mesmo período no mesmo dia) foi **confirmada correta na aplicação de produção**; o sintoma só aparece no ambiente de teste da suíte `demo/`
- **Relacionado:** `demo/specs/harness.mjs` (`fecharTurnoSeAberto`); ISSUE-018 (onde o bug foi descoberto, ao corrigir um problema não relacionado no stub de impressão)

---

## 1. Sintoma

No teste "`SPEC-FE-003 — fechar o caixa`: passos 3–4: fecha o turno e o próximo clique no banner volta à abertura" (`demo/specs/navegador.test.js`):

1. Abre um turno, fecha o turno.
2. Clica no banner de novo, tenta **Confirmar abertura** pro mesmo período (mesmo dia).
3. Esperado: erro "Já existe um turno registrado para este período hoje" em `#abertura-erro`.
4. Observado: `#abertura-erro` vem **vazio** — a reabertura parece ter sido aceita, ou o erro não foi renderizado.

O teste é **intermitente**: numa rodada falha, na rodada seguinte (mesmo código, sem mudança) passa. Ver Seção 3.

---

## 2. Causa

**Ainda não confirmada.** O que já foi eliminado como causa:

- A regra de negócio em si está correta: `backend/src/modules/cash-register/application/AbrirCaixa.js` chama `existeParaPeriodo(data, periodo)` e lança `PeriodoJaRegistradoError` corretamente — verificado tanto em `backend/src/modules/cash-register/infrastructure/MySQLCaixaTurnoRepository.js` (SQL `WHERE data = ? AND periodo = ?`, sem filtro de status) quanto em `backend/tests/helpers/MemoriaCaixaTurnoRepository.js` (mesma lógica, in-memory) — os dois batem.
- Testado **ao vivo, na aplicação real** (não na demo): fechar um turno "manhã" já fechado hoje e tentar reabrir o mesmo período bloqueou certinho, com a mensagem certa renderizada na tela. Ou seja, o código de produção (backend real + frontend real) está correto.

**Suspeita não confirmada:** o teste roda o processo Node.js da suíte `demo/testar-specs.mjs` (via `backend/tests/helpers/app-memoria.js` → `montarAppMemoria`, repositórios em memória). `determinarPeriodo()`/`dataHoje()` (`DeterminadorDePeriodo.js`) usam `Intl.DateTimeFormat` com `timeZone: 'America/Recife'`. Descobriu-se, ao investigar isso, que o Git Bash deste ambiente Windows **não resolve corretamente fusos IANA** via `TZ=America/Recife date` — ignora o fuso e imprime UTC rotulado (errado) como GMT, por falta de dados de fuso horário nesse shell específico. Ainda não foi confirmado (nem descartado) se o processo Node.js da suíte `demo/` tem o mesmo tipo de limitação nesse ambiente Windows, o que faria `determinarPeriodo()` calcular um período diferente entre a chamada de abrir e a de fechar/reabrir do mesmo teste — bateria com o sintoma (intermitência: depende de estar perto ou não de uma virada de período/dia na resolução "errada" do fuso).

Também não descartado: um problema de timing/paralelismo específico do `node --test` rodando os specs da demo (mesma classe de problema já visto e corrigido no ISSUE-017, seção 5 — mas lá era sobre conexões de pool do MySQL, não aplicável aqui já que a demo usa repositórios em memória).

---

## 3. Correção proposta

Não implementada — a causa raiz não está confirmada. Próximos passos sugeridos:

1. Comparar a saída de `node -e "console.log(new Intl.DateTimeFormat('en-US',{timeZone:'America/Recife',hour:'numeric',hourCycle:'h23'}).format(new Date()))"` rodado solto nesta máquina Windows vs. um `console.log` temporário dentro de `DeterminadorDePeriodo.js` executado via `cd demo && npm run testar` — ver se o fuso resolve diferente dentro do processo da suíte.
2. Logar temporariamente `data`/`periodo` recebidos por `MemoriaCaixaTurnoRepository.existeParaPeriodo` nas duas chamadas do teste (abrir e reabrir), pra confirmar se batem ou divergem.
3. Rodar o teste isolado repetidas vezes (`node --test demo/specs/navegador.test.js` sozinho, sem o resto da suíte) pra ver se a intermitência é sobre paralelismo entre specs ou realmente sobre tempo/fuso.

**Não mudar a regra de negócio** (bloquear reabertura do mesmo período) sem confirmar antes com o dono do produto — ela já foi verificada correta na aplicação real; se a causa for só do ambiente de teste, a correção é no teste/harness, não no código de produção (mesmo precedente do ISSUE-005: mudança de regra de negócio exige aprovação explícita, não decisão unilateral).

---

## 4. Teste permanente (canário)

Ainda não aplicável — a issue está aberta. Quando a causa for confirmada e corrigida, o próprio teste já existente (`demo/specs/navegador.test.js`, "SPEC-FE-003 — fechar o caixa") passa a servir de canário; se ele continuar intermitente depois de uma tentativa de correção, a correção não resolveu a causa raiz.

**Log bruto observado (rodada com falha):**
```
✖ passos 3–4: fecha o turno e o próximo clique no banner volta à abertura (4472.8598ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /turno registrado para este período/i. Input:

  ''

      at file:///.../demo/specs/navegador.test.js:254:14
```

**Log bruto observado (rodada seguinte, sem nenhuma mudança de código, passou):**
```
▶ SPEC-FE-003 — fechar o caixa
✔ SPEC-FE-003 — fechar o caixa
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

---

## 5. Nota de processo

Esta issue foi aberta a partir de uma descoberta incidental: corrigir um bug real e não relacionado no stub de `window.print` da suíte `demo/` (ISSUE-018, Seção 5) destravou um teste que nunca tinha chegado a rodar até o fim antes (o teste sempre travava no passo de impressão, escondendo o que vinha depois). Como o teste é intermitente e a regra de negócio já foi confirmada correta na aplicação real, o risco pra produção é considerado baixo — mas fica registrado para não se perder, em vez de só um lembrete de sessão.
