import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarEstoque } from '../../src/modules/estoque/api.js';
import { htmlTabelaEstoque } from '../../src/modules/estoque/lista.js';
import moduloEstoque from '../../src/modules/estoque/index.js';

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

const itemPao = {
  produto_id: 12,
  nome: 'Pão Francês',
  data: '2026-08-17',
  inicial: 52,
  produzido: 0,
  vendido: 0,
  disponivel: 52,
  minimo: 10,
  abaixo_do_minimo: false,
};

const itemAbaixo = {
  produto_id: 13,
  nome: 'Broa',
  data: '2026-08-17',
  inicial: 4,
  produzido: 0,
  vendido: 0,
  disponivel: 4,
  minimo: 10,
  abaixo_do_minimo: true,
};

describe('Passo 1 — listagem do estoque do dia', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloEstoque.id, 'estoque');
    assert.equal(moduloEstoque.label, 'Estoque');
    assert.equal(moduloEstoque.icone, 'ti-boxes');
    assert.equal(moduloEstoque.permissao, 'estoque');
    assert.equal(typeof moduloEstoque.montar, 'function');
    assert.equal(typeof moduloEstoque.desmontar, 'function');
  });

  test('listarEstoque consome GET /estoque sem exigir data (backend usa hoje e aplica rollover)', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [itemPao],
        pagination: { page: 1, limit: 100, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarEstoque();
    assert.equal(resposta.data[0].nome, 'Pão Francês');
    assert.equal(resposta.data[0].inicial, 52);
    assert.match(urls[0], /\/estoque/);
    assert.doesNotMatch(urls[0], /data=/);
  });

  test('tabela mostra produto, inicial, produzido, vendido, disponível destacado e mínimo', () => {
    const html = htmlTabelaEstoque([itemPao]);
    assert.match(html, /Pão Francês/);
    assert.match(html, /Inicial/);
    assert.match(html, /Produzido/);
    assert.match(html, /Vendido/);
    assert.match(html, /Disponível/);
    assert.match(html, /Mínimo/);
    assert.match(html, /estoque-disponivel/);
    assert.doesNotMatch(html, /<input/i);
    assert.doesNotMatch(html, /estoque-linha-abaixo-minimo/);
  });

  test('destaque de abaixo do mínimo vem do backend, sem recálculo na UI', () => {
    const comFlag = htmlTabelaEstoque([{ ...itemAbaixo, disponivel: 999, minimo: 1, abaixo_do_minimo: true }]);
    assert.match(comFlag, /estoque-linha-abaixo-minimo/);
    assert.match(comFlag, /Abaixo do mínimo/);

    const semFlag = htmlTabelaEstoque([{ ...itemAbaixo, disponivel: 1, minimo: 99, abaixo_do_minimo: false }]);
    assert.doesNotMatch(semFlag, /estoque-linha-abaixo-minimo/);
  });
});
