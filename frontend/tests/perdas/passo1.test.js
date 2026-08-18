import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarPerdas } from '../../src/modules/perdas/api.js';
import { htmlFiltrosPerdas, htmlTabelaPerdas } from '../../src/modules/perdas/lista.js';
import moduloPerdas from '../../src/modules/perdas/index.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['perdas'],
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

const itemPerda = {
  id: 8,
  produto: 'Pão Francês',
  data: '2026-08-17',
  quantidade: 5,
  motivo: 'queimado',
  custo_calculado: 1.5,
  usuario: 'Isadora Karem',
  ativo: 1,
};

describe('Passo 1 — listagem de perdas', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloPerdas.id, 'perdas');
    assert.equal(moduloPerdas.label, 'Perdas');
    assert.equal(moduloPerdas.icone, 'ti-trash');
    assert.equal(moduloPerdas.permissao, 'perdas');
    assert.equal(typeof moduloPerdas.montar, 'function');
    assert.equal(typeof moduloPerdas.desmontar, 'function');
  });

  test('listarPerdas consome GET /perdas com filtros de período, produto e motivo', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [itemPerda],
        pagination: { page: 1, limit: 50, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarPerdas({
      data_inicio: '2026-08-01',
      data_fim: '2026-08-17',
      produto_id: 12,
      motivo: 'queimado',
    });
    assert.equal(resposta.data[0].produto, 'Pão Francês');
    assert.match(urls[0], /\/perdas/);
    assert.match(urls[0], /data_inicio=2026-08-01/);
    assert.match(urls[0], /data_fim=2026-08-17/);
    assert.match(urls[0], /produto_id=12/);
    assert.match(urls[0], /motivo=queimado/);
  });

  test('tabela mostra produto, data, quantidade, motivo, custo e responsável', () => {
    const html = htmlTabelaPerdas([itemPerda]);
    assert.match(html, /Pão Francês/);
    assert.match(html, /2026-08-17/);
    assert.match(html, /Quantidade/);
    assert.match(html, /Motivo/);
    assert.match(html, /Custo/);
    assert.match(html, /Responsável/);
    assert.match(html, /Isadora Karem/);
    assert.match(html, /Queimado/);
  });

  test('filtros incluem período, produto e motivo', () => {
    const html = htmlFiltrosPerdas({
      filtros: { dataInicio: '2026-08-01', dataFim: '2026-08-17', produtoId: '12', motivo: 'queimado', ativo: '1' },
      produtos: [{ id: 12, nome: 'Pão Francês' }],
      ehAdmin: true,
    });
    assert.match(html, /perdas-data-inicio/);
    assert.match(html, /perdas-data-fim/);
    assert.match(html, /perdas-filtro-produto/);
    assert.match(html, /perdas-filtro-motivo/);
    assert.doesNotMatch(html, /type="text"[^>]*motivo/i);
  });
});
