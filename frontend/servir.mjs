import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const porta = Number(process.env.PORTA || 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${porta}`);
  const pedido = decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname);
  const relativo = pedido.replace(/^\/+/, '').replace(/\\/g, '/');
  const arquivo = path.normalize(path.join(raiz, ...relativo.split('/')));

  const raizSegura = raiz.endsWith(path.sep) ? raiz : `${raiz}${path.sep}`;
  if (arquivo !== raiz && !arquivo.startsWith(raizSegura)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const dados = await fs.readFile(arquivo);
    const tipo = mime[path.extname(arquivo)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': tipo });
    res.end(dados);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  }
});

servidor.listen(porta, '127.0.0.1', () => {
  process.stdout.write(`Frontend em http://127.0.0.1:${porta}/index.html\n`);
});
