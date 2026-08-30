# Depois do período de teste (V2 neste PC)

Congelado de propósito. Não implementar da lista abaixo enquanto a loja estiver no teste do dia a dia. Quando o teste acabar, atacar **nesta ordem**, uma coisa por vez.

| # | O quê | Onde |
|---|---|---|
| 1 | Login: 5 erros / **2 min** / acertar a senha **zera** (hoje: 15 min, não zera) | ISSUE-015 |
| 2 | Ensaio de verdade: reiniciar o Windows e só o atalho | `deploy/COMO-LIGAR.md` |
| 3 | Backup diário agendado + um restore de prova | `deploy/backup.ps1`, `deploy/restaurar.ps1` |
| 4 | Commit do que ainda está só nesta pasta (PDV, deploy, docs) | Git, quando o operador pedir |
| 5 | E2E além do Chromium da demo | ISSUE-014 — só se doer |

**Fora desta lista (não entra no “vamos pra cima” do teste):** Electron, Edge, Cypress, TEF, fiscal, pasta `e2e/` com três motores.
