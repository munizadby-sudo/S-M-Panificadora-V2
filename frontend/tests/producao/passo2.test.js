import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { listarEstoque } from '../../src/modules/estoque/api.js';
import { htmlFormularioProducao } from '../../src/modules/producao/formulario.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['producao', 'estoque'],
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

describe('Passo 2 — feedback do saldo após o lançamento', () => {
  test('confirmação exibe novo saldo disponível', () => {
    const html = htmlFormularioProducao({
      formulario: {},
      confirmacao: {
        producao: { produto_id: 12, data: '2026-08-22', quantidade: 40 },
        disponivel: 45,
      },
    });
    assert.match(html, /Novo saldo disponível/);
    assert.match(html, /producao-disponivel-confirmacao/);
    assert.match(html, /45/);
  });

  test('listarEstoque consulta produto e data após lançar produção', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [{ produto_id: 12, nome: 'Pão Francês', data: '2026-08-22', disponivel: 45 }],
        pagination: { page: 1, limit: 1, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarEstoque({ produto_id: 12, data: '2026-08-22', limit: 1 });
    assert.equal(resposta.data[0].disponivel, 45);
    assert.match(urls[0], /\/estoque/);
    assert.match(urls[0], /produto_id=12/);
    assert.match(urls[0], /data=2026-08-22/);
  });
});
