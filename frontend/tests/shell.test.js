import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from './helpers/ambiente.js';
import {
  CHAVE_STORAGE_TOKEN,
  estaAutenticado,
  limparSessao,
  salvarSessao,
} from '../src/core/session.js';
import { protegerShell, redirecionarSeAutenticado } from '../src/modules/auth/guarda.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = readFileSync(join(frontend, 'index.html'), 'utf8');
const loginHtml = readFileSync(join(frontend, 'login.html'), 'utf8');

beforeEach(() => {
  instalarAmbienteDeTeste();
});

describe('shell e guarda de rota', () => {
  test('index.html redireciona para login quando não há sessão', () => {
    assert.match(indexHtml, /type=["']module["']/);
    assert.match(indexHtml, /protegerShell/);
    assert.match(indexHtml, new RegExp(CHAVE_STORAGE_TOKEN));
    assert.doesNotMatch(indexHtml, /modules\/(pdv|estoque|produtos)/);

    limparSessao();
    assert.equal(estaAutenticado(), false);
    const destinos = [];
    assert.equal(protegerShell((url) => destinos.push(url)), false);
    assert.deepEqual(destinos, ['login.html']);
  });

  test('index.html não redireciona quando há sessão', () => {
    salvarSessao('token-ok', {
      id: 1,
      nome: 'Admin',
      username: 'admin',
      role: 'admin',
      permissoes: [],
    });
    assert.equal(estaAutenticado(), true);
    const destinos = [];
    assert.equal(protegerShell((url) => destinos.push(url)), true);
    assert.deepEqual(destinos, []);
  });

  test('login.html redireciona para o shell quando já autenticado', () => {
    assert.match(loginHtml, /redirecionarSeAutenticado/);
    assert.match(loginHtml, /location\.replace\('index\.html'\)/);

    salvarSessao('token-ok', {
      id: 1,
      nome: 'Admin',
      username: 'admin',
      role: 'admin',
      permissoes: [],
    });
    const destinos = [];
    assert.equal(redirecionarSeAutenticado((url) => destinos.push(url)), true);
    assert.deepEqual(destinos, ['index.html']);
  });

  test('nenhum arquivo fora de core/api.js chama fetch()', () => {
    const arquivos = listarArquivosJs(join(frontend, 'src'))
      .filter((arquivo) => !arquivo.endsWith(`${join('core', 'api.js')}`));

    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(
        fonte,
        /\bfetch\s*\(/,
        `${arquivo} não pode chamar fetch() diretamente`,
      );
    }

    assert.match(readFileSync(join(frontend, 'src', 'core', 'api.js'), 'utf8'), /\bfetch\s*\(/);
  });

  test('router só é carregado depois da guarda de sessão no shell', () => {
    const trechoModulo = indexHtml.split('protegerShell()')[1];
    assert.ok(trechoModulo);
    assert.match(trechoModulo, /import\('\.\/src\/core\/router\.js'\)/);
    assert.doesNotMatch(
      indexHtml.split('<script type="module">')[1].split('protegerShell()')[0],
      /router/,
    );
  });
});

function listarArquivosJs(diretorio) {
  return readdirSync(diretorio, { recursive: true })
    .filter((entrada) => extname(entrada) === '.js')
    .map((entrada) => join(diretorio, entrada));
}
