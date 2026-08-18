import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarEstoque } from '../../src/modules/estoque/api.js';
import { montarSeletorCategoria } from '../../src/modules/produtos/categorias.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pastaEstoque = join(frontend, 'src', 'modules', 'estoque');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['estoque'],
  });
});

function jsonOk(corpo) {
  return {
    status: 200,
    ok: true,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 2 — busca e filtro por categoria', () => {
  test('listarEstoque envia busca e categoria_id na query', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ data: [], pagination: { page: 1, limit: 100, total: 0, pages: 1 } });
    };

    await listarEstoque({ busca: 'pao', categoria_id: 3 });
    assert.match(urls[0], /\/estoque/);
    assert.match(urls[0], /busca=pao/);
    assert.match(urls[0], /categoria_id=3/);
  });

  test('módulo reaproveita SeletorCategoria de produtos, sem duplicar o componente', () => {
    const fontes = readdirSync(pastaEstoque)
      .filter((nome) => extname(nome) === '.js')
      .map((nome) => readFileSync(join(pastaEstoque, nome), 'utf8'));
    const codigo = fontes.join('\n');

    assert.match(codigo, /from ['"]\.\.\/produtos\/categorias\.js['"]/);
    assert.match(codigo, /montarSeletorCategoria/);
    assert.doesNotMatch(codigo, /export function montarSeletorCategoria/);
    assert.ok(
      !readdirSync(pastaEstoque).some((nome) => /seletor|categoria/i.test(nome)),
      'não deve haver arquivo de seletor/categoria duplicado em estoque',
    );
  });

  test('o seletor reaproveitado preenche categorias com opção Todas', () => {
    const select = { innerHTML: '', value: '' };
    montarSeletorCategoria(select, [{ id: 3, nome: 'Pães' }], { incluirTodos: true, valor: 3 });
    assert.match(select.innerHTML, /Pães/);
    assert.match(select.innerHTML, /Todas/);
    assert.match(select.innerHTML, /value="3"/);
  });
});
