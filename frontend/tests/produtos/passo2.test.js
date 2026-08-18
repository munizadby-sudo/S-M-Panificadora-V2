import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { criarCategoria, desativarCategoria, listarCategorias, mensagemErroCategoria, reativarCategoria } from '../../src/modules/produtos/api.js';
import { htmlPainelCategorias, montarSeletorCategoria } from '../../src/modules/produtos/categorias.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['produtos'],
  });
});

function jsonOk(corpo, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 2 — CRUD de categorias', () => {
  test('criarCategoria envia POST /categorias', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method, body: init?.body });
      return jsonOk({ id: 3, nome: 'Pães', ativo: 1 });
    };

    const salva = await criarCategoria({ nome: 'Pães' });
    assert.equal(salva.nome, 'Pães');
    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/categorias$/);
    assert.equal(JSON.parse(chamadas[0].body).nome, 'Pães');
  });

  test('desativarCategoria envia DELETE /categorias/:id', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method });
      return jsonOk({ mensagem: 'Categoria desativada.' });
    };

    await desativarCategoria(3);
    assert.equal(chamadas[0].method, 'DELETE');
    assert.match(chamadas[0].url, /\/categorias\/3$/);
  });

  test('listagem de categorias rotula a ação como Desativar, nunca Excluir', () => {
    const html = htmlPainelCategorias([{ id: 3, nome: 'Pães' }], { podeDesativar: true });
    assert.match(html, /Pães/);
    assert.match(html, /Desativar/);
    assert.doesNotMatch(html, /Excluir/i);
    assert.match(html, /form-nova-categoria/);
  });

  test('seletor reaproveitável é preenchido com as categorias ativas', () => {
    const select = { innerHTML: '', value: '' };
    montarSeletorCategoria(select, [{ id: 3, nome: 'Pães' }, { id: 4, nome: 'Bolos' }], {
      valor: 4,
    });
    assert.match(select.innerHTML, /Pães/);
    assert.match(select.innerHTML, /Bolos/);
    assert.match(select.innerHTML, /value="4" selected/);
  });

  test('409 de categoria duplicada vira mensagem de negócio', () => {
    const erro = new ApiError({ status: 409, mensagem: 'Já existe uma categoria com este nome.' });
    assert.equal(mensagemErroCategoria(erro), 'Já existe uma categoria com este nome.');
  });

  test('Mostrar inativos vale para categorias e inativa exibe Reativar', async () => {
    const html = htmlPainelCategorias([{ id: 3, nome: 'Pães', ativo: 0 }], { podeDesativar: true });
    assert.match(html, /Inativo/);
    assert.match(html, /produtos-item-inativo/);
    assert.match(html, />Reativar</);
    assert.doesNotMatch(html, />Desativar</);

    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ data: [{ id: 3, nome: 'Pães', ativo: 0 }] });
    };
    await listarCategorias({ ativo: 0 });
    assert.match(urls[0], /\/categorias/);
    assert.match(urls[0], /ativo=0/);
  });

  test('reativarCategoria envia POST /categorias/:id/reativar', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method });
      return jsonOk({ mensagem: 'Categoria reativada.' });
    };
    await reativarCategoria(3);
    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/categorias\/3\/reativar$/);
  });

  test('nenhum arquivo do módulo usa a palavra Excluir', () => {
    const pasta = join(frontend, 'src', 'modules', 'produtos');
    for (const nome of readdirSync(pasta).filter((arquivo) => extname(arquivo) === '.js')) {
      const fonte = readFileSync(join(pasta, nome), 'utf8');
      assert.doesNotMatch(fonte, /Excluir/i, `${nome} não pode usar Excluir`);
    }
  });
});
