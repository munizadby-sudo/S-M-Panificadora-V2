import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Usuario } from '../backend/src/modules/users/domain/Usuario.js';
import { EstoqueDiario, dataHoje } from '../backend/src/modules/inventory/domain/EstoqueDiario.js';
import { montarAppMemoria } from '../backend/tests/helpers/app-memoria.js';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.join(RAIZ, '..', 'frontend');
const NAVEGADORES = path.join(RAIZ, 'pw-browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = NAVEGADORES;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function ouvirExpress(app) {
  return new Promise((resolve, reject) => {
    const servidor = app.listen(0, '127.0.0.1', () => resolve(servidor));
    servidor.on('error', reject);
  });
}

function ouvirHttp(criar) {
  return new Promise((resolve, reject) => {
    const servidor = criar();
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', () => resolve(servidor));
  });
}

function fechar(servidor) {
  return new Promise((resolve, reject) => {
    if (!servidor) {
      resolve();
      return;
    }
    servidor.close((erro) => (erro ? reject(erro) : resolve()));
  });
}

function servirFrontend() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const pedido = decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname);
    const relativo = pedido.replace(/^\/+/, '').replace(/\\/g, '/');
    const arquivo = path.normalize(path.join(FRONTEND, ...relativo.split('/')));
    const raizSegura = FRONTEND.endsWith(path.sep) ? FRONTEND : `${FRONTEND}${path.sep}`;
    if (arquivo !== FRONTEND && !arquivo.startsWith(raizSegura)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      const dados = await fs.readFile(arquivo);
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(arquivo)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(dados);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado');
    }
  });
}

async function json(resposta) {
  const texto = await resposta.text();
  return texto ? JSON.parse(texto) : null;
}

async function semearCatalogo(porta, ctx) {
  const origem = `http://127.0.0.1:${porta}`;
  const login = await fetch(`${origem}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', senha: 'admin123' }),
  });
  const { token } = await json(login);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const categoria = await json(
    await fetch(`${origem}/api/categorias`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome: 'Pães' }),
    }),
  );
  const produto = await json(
    await fetch(`${origem}/api/produtos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nome: 'Pão Francês',
        categoria_id: categoria.id,
        preco: 1.5,
        custo: 0.3,
      }),
    }),
  );
  await ctx.estoqueRepository.salvar(
    new EstoqueDiario({ produtoId: produto.id, data: dataHoje(), inicial: 40 }),
  );
}

async function main() {
  const ctx = montarAppMemoria();
  await ctx.usuarioRepository.salvar(
    new Usuario({
      nome: 'Administrador',
      username: 'admin',
      senhaHash: await ctx.hashService.hash('admin123'),
      role: 'admin',
    }),
  );
  await ctx.usuarioRepository.salvar(
    new Usuario({
      nome: 'Maria Silva',
      username: 'maria',
      senhaHash: await ctx.hashService.hash('maria123'),
      role: 'operador',
      permissoes: ['caixa', 'encomendas', 'estoque', 'fluxo'],
    }),
  );

  const api = await ouvirExpress(ctx.app);
  const front = await ouvirHttp(servirFrontend);
  const portaApi = api.address().port;
  const portaFront = front.address().port;

  try {
    await semearCatalogo(portaApi, ctx);
    process.stdout.write(`SPECs no navegador\n  front http://127.0.0.1:${portaFront}\n  api   http://127.0.0.1:${portaApi}\n`);

    const codigo = await new Promise((resolve, reject) => {
      const filho = spawn(
        process.execPath,
        ['--test', '--test-concurrency=1', '--test-timeout=60000', 'specs/navegador.test.js'],
        {
          cwd: RAIZ,
          env: {
            ...process.env,
            SM_E2E_FRONT: `http://127.0.0.1:${portaFront}`,
            SM_E2E_API: `http://127.0.0.1:${portaApi}/api`,
            PLAYWRIGHT_BROWSERS_PATH: NAVEGADORES,
          },
          stdio: 'inherit',
        },
      );
      filho.on('error', reject);
      filho.on('exit', (code) => resolve(code ?? 1));
    });
    process.exitCode = codigo;
  } finally {
    await fechar(front);
    await fechar(api);
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
