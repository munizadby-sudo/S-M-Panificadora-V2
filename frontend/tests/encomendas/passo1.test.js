import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarEncomendas } from '../../src/modules/encomendas/api.js';
import { htmlFiltrosEncomendas, htmlTabelaEncomendas } from '../../src/modules/encomendas/lista.js';
import moduloEncomendas from '../../src/modules/encomendas/index.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['encomendas'],
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

const itemEncomenda = {
  id: 3,
  numero: 45,
  cliente: 'Maria Souza',
  cliente_telefone: '83999998888',
  data_entrega: '2026-08-25',
  sinal: 20,
  total: 40,
  status: 'pendente',
  ativo: 1,
};

describe('Passo 1 — listagem com filtro por status', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloEncomendas.id, 'encomendas');
    assert.equal(moduloEncomendas.label, 'Encomendas');
    assert.equal(moduloEncomendas.permissao, 'encomendas');
    assert.equal(typeof moduloEncomendas.montar, 'function');
    assert.equal(typeof moduloEncomendas.desmontar, 'function');
  });

  test('listarEncomendas consome GET /encomendas com filtro de status e período', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [itemEncomenda],
        pagination: { page: 1, limit: 50, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarEncomendas({
      status: 'pendente',
      data_entrega_inicio: '2026-08-01',
      data_entrega_fim: '2026-08-31',
    });
    assert.equal(resposta.data[0].cliente, 'Maria Souza');
    assert.match(urls[0], /\/encomendas/);
    assert.match(urls[0], /status=pendente/);
    assert.match(urls[0], /data_entrega_inicio=2026-08-01/);
  });

  test('tabela mostra número, cliente, entrega, sinal, total e semáforo de status', () => {
    const html = htmlTabelaEncomendas([itemEncomenda]);
    assert.match(html, /45/);
    assert.match(html, /Maria Souza/);
    assert.match(html, /2026-08-25/);
    assert.match(html, /encomendas-semaforo-pendente/);
    assert.match(html, /data-avancar-status="3"/);
    assert.doesNotMatch(html, /encomendas-select-status/);
  });

  test('encomenda cancelada não mostra ação de avançar status, só o rótulo', () => {
    const html = htmlTabelaEncomendas([{ ...itemEncomenda, ativo: 0, status: 'pendente' }]);
    assert.doesNotMatch(html, /data-avancar-status/);
    assert.match(html, /Cancelada/);
  });

  test('encomenda entregue trava edição e só admin vê Reabrir', () => {
    const entregue = { ...itemEncomenda, status: 'entregue' };
    const operador = htmlTabelaEncomendas([entregue]);
    assert.match(operador, /encomendas-semaforo-entregue/);
    assert.doesNotMatch(operador, /data-editar-encomenda/);
    assert.doesNotMatch(operador, /data-reabrir-encomenda/);

    const admin = htmlTabelaEncomendas([entregue], { admin: true });
    assert.match(admin, /data-reabrir-encomenda="3"/);
  });

  test('encomenda pronta oferece entregar, com dica de aguardando retirada', () => {
    const html = htmlTabelaEncomendas([{ ...itemEncomenda, status: 'pronto' }]);
    assert.match(html, /data-finalizar-encomenda="3"/);
    assert.match(html, /Aguardando retirada/);
    assert.doesNotMatch(html, /encomendas-select-status/);
  });

  test('filtros incluem status e período de entrega', () => {
    const html = htmlFiltrosEncomendas({
      filtros: { status: 'pendente', dataEntregaInicio: '2026-08-01', dataEntregaFim: '2026-08-31', ativo: '1' },
    });
    assert.match(html, /encomendas-filtro-status/);
    assert.match(html, /encomendas-data-inicio/);
    assert.match(html, /encomendas-data-fim/);
  });
});
