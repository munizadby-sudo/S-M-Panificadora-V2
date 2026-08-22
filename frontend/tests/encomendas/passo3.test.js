import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { buscarEncomenda, atualizarEncomenda, cancelarEncomenda } from '../../src/modules/encomendas/api.js';
import { htmlModalCancelamento } from '../../src/modules/encomendas/modal-cancelamento.js';

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

describe('Passo 3/4/6 — edição, atualização e cancelamento', () => {
  test('buscarEncomenda consulta o detalhe completo com itens (GET /encomendas/:id)', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        id: 3,
        numero: 45,
        cliente_id: null,
        cliente_nome: 'Maria Souza',
        cliente_telefone: '83999998888',
        data_entrega: '2026-08-25',
        sinal: 10,
        total: 15,
        status: 'pendente',
        itens: [{ produto_id: 12, quantidade: 10, preco_unitario: 1.5, subtotal: 15 }],
      });
    };

    const encomenda = await buscarEncomenda(3);
    assert.match(urls[0], /\/encomendas\/3$/);
    assert.equal(encomenda.itens.length, 1);
  });

  test('atualizarEncomenda envia PUT /encomendas/:id substituindo os itens', async () => {
    const urls = [];
    const metodos = [];
    const corpos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      metodos.push(init.method);
      corpos.push(JSON.parse(init.body));
      return jsonOk({ id: 3, numero: 45, total: 3 });
    };

    await atualizarEncomenda(3, {
      cliente_nome: 'Maria Souza',
      cliente_telefone: '83999998888',
      data_entrega: '2026-08-26',
      itens: [{ produto_id: 15, quantidade: 1 }],
    });
    assert.match(urls[0], /\/encomendas\/3$/);
    assert.equal(metodos[0], 'PUT');
    assert.deepEqual(corpos[0].itens, [{ produto_id: 15, quantidade: 1 }]);
  });

  test('modal de cancelamento nunca usa a palavra "Excluir"', () => {
    const html = htmlModalCancelamento({
      encomenda: { id: 3, numero: 45, cliente: 'Maria Souza', total: 15 },
    });
    assert.doesNotMatch(html, /Excluir/i);
    assert.match(html, /Cancelar encomenda/);
    assert.match(html, /continuará no histórico/);
  });

  test('modal de cancelamento vazio (sem encomenda selecionada) não renderiza nada', () => {
    assert.equal(htmlModalCancelamento({ encomenda: null }), '');
  });

  test('cancelarEncomenda envia DELETE /encomendas/:id', async () => {
    const urls = [];
    const metodos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      metodos.push(init.method);
      return jsonOk({ mensagem: 'Encomenda cancelada.' });
    };

    await cancelarEncomenda(3);
    assert.match(urls[0], /\/encomendas\/3$/);
    assert.equal(metodos[0], 'DELETE');
  });
});
