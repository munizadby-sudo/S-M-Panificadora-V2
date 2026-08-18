import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarProdutos } from '../../src/modules/produtos/api.js';
import { montarSeletorCategoria } from '../../src/modules/produtos/categorias.js';
import moduloProdutos, { htmlTabelaProdutos } from '../../src/modules/produtos/index.js';

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

function jsonOk(corpo) {
  return {
    status: 200,
    ok: true,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 1 — listagem de produtos', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloProdutos.id, 'produtos');
    assert.equal(moduloProdutos.label, 'Produtos');
    assert.equal(moduloProdutos.icone, 'ti-bread');
    assert.equal(moduloProdutos.permissao, 'produtos');
    assert.equal(typeof moduloProdutos.montar, 'function');
    assert.equal(typeof moduloProdutos.desmontar, 'function');
  });

  test('listarProdutos consome GET /produtos com busca e categoria', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [{ id: 12, nome: 'Pão Francês', categoria_id: 3, icone: '🥖', preco: 0.75, custo: 0.3, ativo: 1 }],
        pagination: { page: 1, limit: 50, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarProdutos({ busca: 'pao', categoria_id: 3, ativo: 1 });
    assert.equal(resposta.data[0].nome, 'Pão Francês');
    assert.match(urls[0], /\/produtos/);
    assert.match(urls[0], /busca=pao/);
    assert.match(urls[0], /categoria_id=3/);
    assert.match(urls[0], /ativo=1/);
  });

  test('tabela renderiza nome, categoria, preço e ícone', () => {
    const html = htmlTabelaProdutos([
      { id: 1, nome: 'Pão Francês', categoria_id: 3, categoria_nome: 'Pães', icone: '🥖', preco: 0.75, custo: 0.3 },
    ]);
    assert.match(html, /Pão Francês/);
    assert.match(html, /Pães/);
    assert.match(html, /🥖/);
    assert.match(html, /0,75/);
  });

  test('seletor de categoria é isolado e reaproveitável', () => {
    const select = { innerHTML: '', value: '' };
    montarSeletorCategoria(select, [{ id: 3, nome: 'Pães' }], { incluirTodos: true, valor: 3 });
    assert.match(select.innerHTML, /Pães/);
    assert.match(select.innerHTML, /Todas/);
    assert.match(select.innerHTML, /value="3"/);
  });

  test('nenhum arquivo do módulo produtos chama fetch()', () => {
    const pasta = join(frontend, 'src', 'modules', 'produtos');
    const arquivos = readdirSync(pasta)
      .filter((nome) => extname(nome) === '.js')
      .map((nome) => join(pasta, nome));
    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(fonte, /\bfetch\s*\(/, `${arquivo} não pode chamar fetch()`);
    }
  });

  test('alternância Mostrar inativos lista inativos via ativo=0 ou omitindo o filtro', async () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'produtos', 'index.js'), 'utf8');
    assert.match(fonte, /Mostrar inativos/);
    assert.match(fonte, /produtos-toggle/);
    assert.match(fonte, /mostrar-inativos/);

    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ data: [], pagination: { page: 1, limit: 50, total: 0, pages: 1 } });
    };

    await listarProdutos({ ativo: 0 });
    await listarProdutos({});
    assert.match(urls[0], /ativo=0/);
    assert.doesNotMatch(urls[1], /ativo=/);
  });
});
