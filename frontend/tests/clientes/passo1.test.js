import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarClientes } from '../../src/modules/clientes/api.js';
import moduloClientes, { htmlTabelaClientes } from '../../src/modules/clientes/index.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['clientes'],
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

describe('Passo 1 — listagem de clientes', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloClientes.id, 'clientes');
    assert.equal(moduloClientes.label, 'Clientes');
    assert.equal(moduloClientes.icone, 'ti-users');
    assert.equal(moduloClientes.permissao, 'clientes');
    assert.equal(typeof moduloClientes.montar, 'function');
    assert.equal(typeof moduloClientes.desmontar, 'function');
  });

  test('listarClientes consome GET /clientes com busca e ativo', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [{ id: 5, nome: 'Maria Silva', telefone: '11999998888', ativo: 1 }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarClientes({ busca: 'maria', ativo: 1 });
    assert.equal(resposta.data[0].nome, 'Maria Silva');
    assert.match(urls[0], /\/clientes/);
    assert.match(urls[0], /busca=maria/);
    assert.match(urls[0], /ativo=1/);
  });

  test('tabela renderiza nome e telefone', () => {
    const html = htmlTabelaClientes([{ id: 5, nome: 'Maria Silva', telefone: '11999998888', ativo: 1 }]);
    assert.match(html, /Maria Silva/);
    assert.match(html, /11999998888/);
  });

  test('nenhum arquivo do módulo clientes chama fetch()', () => {
    const pasta = join(frontend, 'src', 'modules', 'clientes');
    const arquivos = readdirSync(pasta)
      .filter((nome) => extname(nome) === '.js')
      .map((nome) => join(pasta, nome));
    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(fonte, /\bfetch\s*\(/, `${arquivo} não pode chamar fetch()`);
    }
  });

  test('alternância Mostrar inativos lista inativos omitindo o filtro ativo', async () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'clientes', 'index.js'), 'utf8');
    assert.match(fonte, /Mostrar inativos/);
    assert.match(fonte, /clientes-toggle/);
    assert.match(fonte, /mostrar-inativos-clientes/);

    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ data: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    };

    await listarClientes({ ativo: 1 });
    await listarClientes({});
    assert.match(urls[0], /ativo=1/);
    assert.doesNotMatch(urls[1], /ativo=/);
  });
});
