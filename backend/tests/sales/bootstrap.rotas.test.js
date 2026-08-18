import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { montarAplicacao } from '../../src/bootstrap.js';
import { comServidor } from '../helpers/app-memoria.js';

const poolFantasma = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  }),
};

describe('bootstrap de produção registra as rotas de vendas', () => {
  const { app } = montarAplicacao({
    pool: poolFantasma,
    jwtSecret: 'teste-bootstrap-vendas',
  });

  test('POST /api/vendas existe no app montado por server.js (401, nunca 404)', async () => {
    await comServidor(app, async (porta) => {
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forma_pagamento: 'dinheiro',
          itens: [{ produto_id: 1, quantidade: 1 }],
        }),
      });
      assert.equal(
        resposta.status,
        401,
        `rota ausente no bootstrap de produção se vier 404 (veio ${resposta.status})`,
      );
    });
  });

  test('GET /api/vendas e DELETE /api/vendas/:id também estão registrados', async () => {
    await comServidor(app, async (porta) => {
      const origem = `http://127.0.0.1:${porta}`;
      const get = await fetch(`${origem}/api/vendas`);
      const del = await fetch(`${origem}/api/vendas/1`, { method: 'DELETE' });
      const resolver = await fetch(`${origem}/api/vendas/correcoes/1/resolver`, {
        method: 'POST',
      });
      assert.equal(get.status, 401, `GET /api/vendas veio ${get.status}`);
      assert.equal(del.status, 401, `DELETE /api/vendas/:id veio ${del.status}`);
      assert.equal(resolver.status, 401, `POST correcoes/resolver veio ${resolver.status}`);
    });
  });
});
