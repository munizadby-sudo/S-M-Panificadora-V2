# RUNBOOK — Implantação do PDV V2 na S&M (piloto)

- **Data alvo de go-live:** 2026-08-30
- **Cenário:** 1 PC Windows (a mesma máquina de desenvolvimento), banco novo (sem migração do V1), 1 posto de operação, impressora térmica.
- **Modelo:** on-premise, dois processos locais (`pdv-api` em `:3001`, `pdv-web` em `:4173`) gerenciados pelo PM2.

> **Escopo congelado.** Isto NÃO inclui: migrations versionadas, helmet/CSP/rate-limit geral, servir o front pelo backend, instalador. Tudo isso é v1.1/v1.2 do roadmap e entra depois, com a experiência desta semana.

---

## Regras de ouro

1. **Backup antes de qualquer mexida** (`deploy\backup.ps1`).
2. **Loja fechada** para instalar, atualizar ou restaurar.
3. Um backup só conta depois de ter sido **restaurado uma vez** com sucesso (`deploy\restaurar.ps1`).
4. O frontend **tem que** ser aberto em `http://localhost:4173` — é essa porta que liga o modo que fala com a API. Em qualquer outra porta ele procura a API na própria origem e não acha.

---

## Estado da máquina (verificado 2026-08-27)

| Item | Situação | O que falta |
|---|---|---|
| Node | `v24.18.0` ✓ | nada |
| npm | `12.0.2` ✓ | nada |
| MySQL 8 | serviço `MySQL80` **instalado**, mas **parado** e em início **Manual** | pôr em Automático, iniciar, e saber a senha do `root` |
| `mysql` / `mysqldump` no PATH | **não** | binários em `C:\Program Files\MySQL\MySQL Server 8.0\bin` — adicionar ao PATH |
| PM2 | não instalado | `npm i -g pm2 pm2-windows-startup` |

---

## PARTE A — Preparação (dia 27–28, na máquina)

- [ ] **A1. Rodar a partir do `main`.** Garantir que a pasta de produção do repositório está na branch `main` e atualizada (`git checkout main && git pull`). Não rodar de worktree.
- [ ] **A2. Node** — já OK (`v24.18.0`).
- [ ] **A3. MySQL 8:**
  - [ ] Adicionar `C:\Program Files\MySQL\MySQL Server 8.0\bin` ao PATH do sistema (Painel de Controle → Variáveis de Ambiente) e **abrir um novo terminal**.
  - [ ] Pôr o serviço em início automático e ligar:
    ```
    powershell -Command "Set-Service MySQL80 -StartupType Automatic; Start-Service MySQL80"
    ```
  - [ ] Definir/saber a senha do `root`. Conferir: `mysql -u root -p -e "SELECT VERSION();"`.
- [ ] **A4. Dependências:**
  ```
  cd backend  && npm ci
  cd ..\frontend && npm ci
  ```
- [ ] **A5. Criar `backend\.env` de produção:**
  ```
  cd deploy
  powershell -ExecutionPolicy Bypass -File .\gerar-env.ps1
  ```
  Responder a senha do MySQL e uma senha inicial forte para o admin.
- [ ] **A6. Suítes verdes** (última conferida antes de subir):
  ```
  cd backend  && npm test
  cd ..\frontend && npm test
  ```
  Esperado: 196 backend + 320 frontend, 0 falhas.
- [ ] **A7. PM2 instalado:**
  ```
  npm i -g pm2 pm2-windows-startup
  pm2-startup install
  ```
- [ ] **A8. Pasta de backup:** criar `C:\PDV-backups`. Escolher o 2º destino (pendrive fixo, pasta do OneDrive/Google Drive) e anotar o caminho.
- [ ] **A9. Nobreak (UPS)** ligado entre a tomada e o PC, se houver. Queda de energia no meio de uma escrita corrompe o MySQL.

---

## PARTE B — Ensaio na máquina (dia 29, com a impressora)

- [ ] **B1. Subir os serviços** (da raiz do repositório):
  ```
  pm2 start ecosystem.config.js
  pm2 save
  pm2 status
  ```
  `pdv-api` e `pdv-web` devem estar `online`.
- [ ] **B2. Abrir** `http://localhost:4173/index.html` no Chrome. Login com `admin` + a senha do A5.
- [ ] **B3. Trocar a senha do admin** (pela tela de usuários — criar nova senha e re-logar).
- [ ] **B4. Criar o(s) usuário(s) operador** com as permissões certas (caixa, produtos, estoque, etc.). O operador do balcão **não** usa a conta admin.
- [ ] **B5. Configurações da loja:** nome, endereço, CNPJ, logo (tela de Configurações ou direto no banco).
- [ ] **B6. Cadastrar os dados REAIS** (não dados de teste — o que for cadastrado aqui fica para o dia 30):
  - [ ] categorias
  - [ ] produtos (nome, preço, categoria, custo)
  - [ ] estoque inicial do dia
- [ ] **B7. Ensaio do fluxo crítico, ponta a ponta, COM impressora:**
  - [ ] abrir caixa (com valor de troco inicial)
  - [ ] venda em **dinheiro** → conferir o troco na tela → **imprimir comprovante** (testa a térmica)
  - [ ] venda em **cartão** e em **pix**
  - [ ] registrar uma **perda**
  - [ ] **prévia de fechamento** → imprimir
  - [ ] **fechar caixa** → **imprimir comprovante de fechamento**
  - [ ] conferir o **relatório de vendas** do dia
- [ ] **B8. Teste de reinício:** reiniciar o Windows. Sem abrir nada, conferir:
  - [ ] `pm2 status` mostra os dois `online` (o `pm2-startup` cuida disso)
  - [ ] `http://localhost:4173` abre normalmente
- [ ] **B9. Teste do backup (obrigatório):**
  ```
  cd deploy
  powershell -File .\backup.ps1 -SenhaMysql "SENHA" -DestinoSecundario "CAMINHO_2"
  powershell -File .\restaurar.ps1 -Arquivo "C:\PDV-backups\sm_AAAAMMDD_HHMM.sql" -SenhaMysql "SENHA"
  ```
  A restauração tem que terminar com "OK — sm_panificadora_scratch restaurado com N tabelas".
- [ ] **B10. Agendar o backup diário** no Task Scheduler:
  - Ação: `powershell.exe -ExecutionPolicy Bypass -File "C:\...\deploy\backup.ps1" -DestinoSecundario "CAMINHO_2"`
  - Variável de ambiente da tarefa: `MYSQL_PWD` = senha do root
  - Gatilho: todo dia, ~30 min após o horário normal de fechamento
- [ ] **B11. Atalho do operador:** criar atalho para
  ```
  "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:4173/index.html
  ```
  na Área de Trabalho **e** na pasta Inicializar (`shell:startup`).
- [ ] **B12. Anotar tudo** que deu errado ou foi confuso — é insumo do v1.1/v1.2.

---

## PARTE C — Go-live (dia 30)

- [ ] **C1.** De manhã, antes de abrir: `powershell -File deploy\backup.ps1 ...` (estado limpo).
- [ ] **C2.** Conferir `pm2 status` — os dois `online`.
- [ ] **C3.** Abrir `http://localhost:4173` pelo atalho, login do operador.
- [ ] **C4.** Abrir o caixa do dia.
- [ ] **C5.** Acompanhar de perto as primeiras 5–10 vendas reais. Ficar por perto o dia todo.
- [ ] **C6.** Fim do dia: **fechar o caixa de verdade** e conferir o comprovante contra o dinheiro físico da gaveta.
- [ ] **C7.** Rodar o backup de novo (ou confirmar que a tarefa agendada rodou).

### Plano de retorno (se desabar no dia 30)

A loja volta para o **caderno / V1** pelo resto do expediente. O backup da manhã (C1) garante zero perda de dados do que foi cadastrado. Reagendar o go-live, corrigir na máquina de desenvolvimento, repetir a Parte B.

---

## Depois: como atualizar o sistema (semanas seguintes)

Enquanto não houver migrations versionadas (v1.1), toda atualização segue este ritual, **com a loja fechada**:

1. `pm2 stop all`
2. `deploy\backup.ps1` — backup do estado atual
3. Guardar a versão atual: copiar a pasta para `..\PDV-v<versao-atual>` (volta rápida se precisar)
4. `git pull` (ou copiar os arquivos novos)
5. `cd backend && npm ci` / `cd frontend && npm ci` (se `package.json` mudou)
6. `pm2 start ecosystem.config.js` — o schema novo se aplica sozinho no boot da API
7. Rodar o **fluxo crítico do B7** como smoke test
8. Deu errado? `pm2 stop all` → restaurar o backup do passo 2 → voltar a pasta do passo 3 → `pm2 start`
9. Deu certo? Anotar a versão no `CHANGELOG` e seguir

---

## Contatos e caminhos

| Item | Valor |
|---|---|
| Pasta do sistema | `_______________________` |
| Pasta de backup local | `C:\PDV-backups` |
| Backup secundário (2ª cópia) | `_______________________` |
| Senha MySQL root | (cofre / gerenciador de senhas — **não** neste arquivo) |
| URL de operação | `http://localhost:4173/index.html` |
| API | `http://127.0.0.1:3001/api` |
