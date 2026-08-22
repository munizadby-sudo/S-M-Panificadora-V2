import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarProducao } from '../../src/modules/producao/api.js';
import { htmlFiltrosProducao, htmlTabelaProducao } from '../../src/modules/producao/lista.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['producao'],
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

const itemProducao = {
  id: 5,
  produto: 'Pão Francês',
  data: '2026-08-22',
  quantidade: 40,
  usuario: 'Isadora Karem',
};

describe('Passo 3 — listagem de lançamentos', () => {
  test('listarProducao consome GET /producao com filtros de período e produto', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [itemProducao],
        pagination: { page: 1, limit: 50, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarProducao({
      data_inicio: '2026-08-01',
      data_fim: '2026-08-22',
      produto_id: 12,
    });
    assert.equal(resposta.data[0].produto, 'Pão Francês');
    assert.match(urls[0], /\/producao/);
    assert.match(urls[0], /data_inicio=2026-08-01/);
    assert.match(urls[0], /data_fim=2026-08-22/);
    assert.match(urls[0], /produto_id=12/);
  });

  test('tabela mostra produto, data, quantidade e responsável', () => {
    const html = htmlTabelaProducao([itemProducao]);
    assert.match(html, /Pão Francês/);
    assert.match(html, /2026-08-22/);
    assert.match(html, /Quantidade/);
    assert.match(html, /Responsável/);
    assert.match(html, /Isadora Karem/);
  });

  test('tabela vazia mostra estado vazio', () => {
    const html = htmlTabelaProducao([]);
    assert.match(html, /Nenhuma produção encontrada/);
  });

  test('filtros incluem período e produto', () => {
    const html = htmlFiltrosProducao({
      filtros: { dataInicio: '2026-08-01', dataFim: '2026-08-22', produtoId: '12' },
      produtos: [{ id: 12, nome: 'Pão Francês' }],
    });
    assert.match(html, /producao-data-inicio/);
    assert.match(html, /producao-data-fim/);
    assert.match(html, /producao-filtro-produto/);
  });
});
