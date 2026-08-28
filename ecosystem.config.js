/**
 * PM2 — sobe a API e o servidor de arquivos do frontend como serviços.
 *
 * Uso na máquina da loja (a partir da raiz do repositório):
 *   npm i -g pm2
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2-startup install     (pacote: npm i -g pm2-windows-startup) — faz subir no boot
 *
 * Comandos do dia a dia:
 *   pm2 status              — ver se pdv-api e pdv-web estão "online"
 *   pm2 logs                — acompanhar log dos dois
 *   pm2 restart pdv-api     — reiniciar só a API (ex.: depois de atualizar)
 *   pm2 resurrect           — restaurar os processos salvos (após reboot manual)
 *
 * A API lê PORTA, JWT_SECRET, MYSQL_* de backend/.env (via dotenv).
 * O frontend só precisa da PORTA 4173 — é o que ativa o modo que aponta para a
 * API em 127.0.0.1:3001 (ver frontend/src/core/ambiente.js).
 */
module.exports = {
  apps: [
    {
      name: 'pdv-api',
      cwd: './backend',
      script: 'src/server.js',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'pdv-web',
      cwd: './frontend',
      script: 'servir.mjs',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: { NODE_ENV: 'production', PORTA: '4173' },
    },
  ],
};
