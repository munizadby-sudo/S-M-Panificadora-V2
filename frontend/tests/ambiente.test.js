import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { obterUrlBaseDaApi } from '../src/core/ambiente.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = readFileSync(join(frontend, 'index.html'), 'utf8');
const loginHtml = readFileSync(join(frontend, 'login.html'), 'utf8');

describe('ambiente da API', () => {
  test('em 127.0.0.1:4173 aponta para o backend na 3001', () => {
    assert.equal(
      obterUrlBaseDaApi({ hostname: '127.0.0.1', port: '4173' }),
      'http://127.0.0.1:3001/api',
    );
    assert.equal(
      obterUrlBaseDaApi({ hostname: 'localhost', port: '4173' }),
      'http://127.0.0.1:3001/api',
    );
  });

  test('em produção (mesma origem) continua no caminho relativo /api', () => {
    assert.equal(obterUrlBaseDaApi({ hostname: 'loja.local', port: '80' }), '/api');
    assert.equal(obterUrlBaseDaApi({ hostname: '127.0.0.1', port: '3001' }), '/api');
  });

  test('index.html e login.html aplicam definirApiBaseUrl antes do restante', () => {
    for (const html of [indexHtml, loginHtml]) {
      assert.match(html, /src\/core\/ambiente\.js/);
      assert.match(html, /definirApiBaseUrl\(obterUrlBaseDaApi\(\)\)/);
      const depoisDoImport = html.split('<script type="module">')[1];
      const indiceBase = depoisDoImport.indexOf('definirApiBaseUrl(obterUrlBaseDaApi())');
      const indiceLogin = depoisDoImport.search(/iniciarFormularioLogin\(|protegerShell\(/);
      assert.ok(indiceBase >= 0 && indiceLogin > indiceBase);
    }
  });
});
