/**
 * PM2 — API (:3001) e tela (:4173) como serviços nesta máquina.
 *
 * Uma vez (loja fechada, nesta pasta):
 *   npm i -g pm2 pm2-windows-startup
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2-startup install
 *
 * Dia a dia: atalho "PDV S&M Panificadora" (abrir-pdv.bat).
 *   pm2 status / pm2 logs / pm2 restart pdv-api
 */
const path = require('path');

const raiz = __dirname;

module.exports = {
  apps: [
    {
      name: 'pdv-api',
      cwd: path.join(raiz, 'backend'),
      script: 'src/server.js',
      interpreter: 'node',
      windowsHide: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'pdv-web',
      cwd: path.join(raiz, 'frontend'),
      script: 'servir.mjs',
      interpreter: 'node',
      windowsHide: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: { NODE_ENV: 'production', PORTA: '4173' },
    },
  ],
};
