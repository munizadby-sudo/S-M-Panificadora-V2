import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarEstoque } from '../../src/modules/estoque/api.js';
import { htmlFormularioPerda } from '../../src/modules/perdas/formulario.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['perdas', 'estoque'],
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

describe('Passo 3 — feedback do saldo após registro', () => {
  test('confirmação exibe novo saldo disponível consultado via GET /estoque', () => {
    const html = htmlFormularioPerda({
      formulario: {},
      confirmacao: {
        perda: {
          produto_id: 12,
          data: '2026-08-17',
          quantidade: 5,
          custo_calculado: 1.5,
        },
        disponivel: 47,
      },
    });
    assert.match(html, /Novo saldo disponível/);
    assert.match(html, /perdas-disponivel-confirmacao/);
    assert.match(html, /47/);
  });

  test('listarEstoque consulta produto e data após registrar perda', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [
          {
            produto_id: 12,
            nome: 'Pão Francês',
            data: '2026-08-17',
            disponivel: 47,
          },
        ],
        pagination: { page: 1, limit: 1, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarEstoque({ produto_id: 12, data: '2026-08-17', limit: 1 });
    assert.equal(resposta.data[0].disponivel, 47);
    assert.match(urls[0], /\/estoque/);
    assert.match(urls[0], /produto_id=12/);
    assert.match(urls[0], /data=2026-08-17/);
  });
});
