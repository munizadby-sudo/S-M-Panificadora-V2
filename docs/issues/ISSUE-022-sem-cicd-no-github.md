# ISSUE-022 — V2 não tinha CI/CD, código subia sem rodar teste nenhum

- **Status:** Corrigido (2026-09-12)
- **Data:** 2026-09-12
- **Módulo:** `.github/workflows/ci.yml` (novo)
- **Severidade:** Média — nada impedia um `git push` com teste quebrado de ir pra `main`; a rede de segurança dependia só de rodar `npm test` na mão antes de subir
- **Relacionado:** ADR-006 §5.2 (atualizada); item 5 de `docs/depois-do-teste.md`

---

## 1. Sintoma

1. O repositório não tinha `.github/` — nenhum workflow, nenhuma verificação automática em push ou PR.
2. Um push pra `main` com backend, frontend ou a suíte `demo/` quebrados não gerava nenhum aviso — só apareceria se alguém rodasse a suíte na mão antes.

---

## 2. Causa

Nunca foi feito. Estava explicitamente na lista congelada do piloto (`docs/depois-do-teste.md`, item 5) — decisão consciente de não montar CI/CD **durante** o piloto de 14 dias (2026-08-30 a 2026-09-13), pra não competir por atenção com o acompanhamento do dia a dia da loja. Ficou pra atacar assim que o piloto fechasse.

---

## 3. Correção aplicada

Novo `.github/workflows/ci.yml`, três jobs paralelos, todos em push/PR na `main`:

- **backend:** serviço `mysql:8.0` efêmero (senha vazia, só nesta execução — não tem relação com a senha real da loja), `.env` de teste gerado só na execução do job, `npm test`.
- **frontend:** `npm test` (sem dependências, projeto puro em JS sem build).
- **demo:** instala o Chromium do Playwright em `demo/pw-browsers` (mesmo caminho que `testar-specs.mjs` já espera) e roda `npm run testar`.

**Deliberadamente não faz:** nenhum deploy, nenhuma publicação automática. O PC da loja continua atualizado só na mão, pelo atalho + PM2 (`deploy/COMO-LIGAR.md`) — CI aqui é só teste, nunca uma esteira de entrega contínua de verdade.

---

## 4. Teste permanente (canário)

Não há como "testar o CI" com um teste automatizado dentro do próprio repositório sem rodar Actions de verdade — o canário aqui é o próprio workflow: qualquer push/PR futuro que quebre backend, frontend ou a suíte `demo/` aparece como falha no GitHub Actions, visível na aba **Actions** do repositório.

Confirmado manualmente antes deste registro: `npm test` do backend (222/222), `npm test` do frontend (380/380) e `cd demo && npm run testar` (15/15, com uma falha intermitente já registrada à parte no ISSUE-021, sem relação com o CI em si) — os três passos que o workflow automatiza já rodavam limpos na máquina de desenvolvimento antes do primeiro push com o workflow.

---

## 5. Nota de processo

Esta issue foi escrita **depois** do commit que introduziu o workflow (`2deb86d`, 2026-09-12) — na hora, a mudança foi documentada em `ADR-006` e `docs/depois-do-teste.md`, mas sem abrir uma `ISSUE-XXX` própria, quebrando a convenção que todas as outras 21 issues deste projeto seguem. Registrado agora, em auditoria de documentação pedida pelo usuário, pra manter a numeração e o histórico consistentes — sem isso, um "o que foi feito no item 5" no futuro precisaria garimpar o commit e a ADR em vez de achar uma issue direto.
