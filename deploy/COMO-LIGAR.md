# Como ligar o PDV neste PC

Este PC **é** o da loja. Implantação feita em 2026-08-30.

De manhã: **clique no atalho PDV S&M Panificadora** (Área de Trabalho).

O atalho liga o banco se estiver parado, sobe API e tela se estiverem mortas, e abre o Chrome em tela cheia. Não abre o Cursor.

Sair do modo tela cheia: `Alt+F4`.

---

## Se a tela não abrir

1. Esperar 30 segundos e clicar de novo.
2. Se o PC acabou de ligar, o MySQL ainda pode estar acordando — segundo clique resolve.
3. Janela preta com erro: deixar aberta e chamar o suporte.
4. `pm2 status` — `pdv-api` e `pdv-web` têm que estar `online`.

---

## PM2 pelo CMD (sem Cursor)

Abrir o **Prompt de Comando**. Se `pm2` não for reconhecido:

```
set PATH=C:\npm-global;%PATH%
```

Ou use o caminho inteiro: `C:\npm-global\pm2.cmd` no lugar de `pm2`.

| O quê | Comando |
|---|---|
| Ver se está no ar | `pm2 status` |
| **Desligar** API e tela | `pm2 stop all` |
| Ligar de novo | `pm2 start all` |
| Reiniciar os dois | `pm2 restart all` |
| Só a API | `pm2 stop pdv-api` / `pm2 restart pdv-api` |
| Log | `pm2 logs` (sair: `Ctrl+C`) |

`stop` não apaga o que o Windows sobe no login. No próximo boot o PM2 volta sozinho. Para **não** subir no boot: `pm2-startup uninstall` (loja fechada; só se souber o que está fazendo).

O Chrome do atalho **não** é o PM2. Fecha com `Alt+F4`.

---

## O que sobe sozinho

| Quando | O quê |
|---|---|
| Login no Windows | MySQL do XAMPP (`deploy/ligar-mysql-xampp.vbs` na pasta Inicializar) |
| Login no Windows | PM2 ressuscita `pdv-api` e `pdv-web` (`pm2-startup`, dump em `%USERPROFILE%\.pm2\dump.pm2`) |
| Clique no atalho | `abrir-pdv.bat` → `deploy/garantir-servicos.ps1` → Chrome kiosk em `http://127.0.0.1:4173/index.html` |

A tela **tem** que ser `127.0.0.1:4173`. Em outra porta o front não acha a API.

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `abrir-pdv.bat` | Atalho da Área de Trabalho |
| `ecosystem.config.js` | PM2: `pdv-api` = `backend/src/server.js`, `pdv-web` = `frontend/servir.mjs` |
| `deploy/garantir-servicos.ps1` | Sobe XAMPP + PM2 se a porta estiver morta |
| `deploy/ligar-mysql-xampp.vbs` | Cópia também em `shell:startup` |
| `deploy/backup.ps1` | Dump do banco (tarefa agendada `PDV Backup Diario`, todo dia 23:30) |
| `deploy/restaurar.ps1` | Restore de prova em `sm_panificadora_scratch` |

PM2 neste PC: `C:\npm-global\pm2.cmd`.

---

## O que não fazer

- **Não** ligar o serviço Windows `MySQL80`. O banco da loja é `C:\xampp\mysql\bin\mysqld.exe` na porta 3306. MySQL80 parado é de propósito.
- **Não** rodar `npm start` no Cursor enquanto o PM2 estiver no ar — as portas 3001 e 4173 batem.
- **Não** apontar a suíte `cd demo && npm run testar` para o MySQL da padaria.

---

## Backup (agendado desde 2026-09-12)

Tarefa do Windows **`PDV Backup Diario`** roda `deploy\backup.ps1` toda noite às 23:30 (usuário logado), grava em `C:\PDV-backups` (retém 30 dias) e usa a senha do MySQL root via `MYSQL_PWD` — não fica em texto solto no script.

Rodar na mão se precisar:

```
powershell -ExecutionPolicy Bypass -File deploy\backup.ps1 -SenhaMysql "SUA_SENHA"
```

Restore de prova feito em 2026-09-12 (`sm_20260912_1132.sql` → `sm_panificadora_scratch`): 21 tabelas, 389 vendas conferidas.

**Risco aceito em 2026-09-12:** por decisão consciente, o backup por enquanto só existe em `C:\PDV-backups`, no mesmo disco C: da loja. Se o disco falhar, os backups falham junto. Sem pendrive/HD externo conectado nem OneDrive logado nesta máquina no momento; retomar quando houver mídia externa ou conta de nuvem disponível — `backup.ps1 -DestinoSecundario "<caminho>"` já suporta copiar pra um segundo lugar assim que existir um.

---

## Atualizar o sistema (loja fechada)

1. `pm2 stop all`
2. `deploy\backup.ps1` (com senha)
3. Trocar os arquivos (ou `git pull`, quando o trabalho da vez estiver commitado)
4. Se `package.json` mudou: `cd backend && npm ci` e o mesmo no `frontend`
5. `pm2 start ecosystem.config.js` (ou `pm2 resurrect`)
6. Clicar no atalho e fazer uma venda de teste + imprimir

Deu errado: `pm2 stop all`, restaurar o backup, voltar os arquivos, `pm2 start`.
