import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Producao } from '../../src/modules/production/domain/Producao.js';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

async function tokenAdmin(porta, ctx) {
  const admin = await ctx.usuarioRepository.salvar(
    new Usuario({
      nome: 'Administrador',
      username: 'admin',
      senhaHash: await ctx.hashService.hash('admin123'),
      role: 'admin',
    }),
  );
  const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', senha: 'admin123' }),
  });
  return { token: (await json(resposta)).token, admin };
}

async function criarProduto(origem, headers, nome = 'Pão Francês') {
  const categoria = await json(
    await fetch(`${origem}/api/categorias`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome: 'Pães' }),
    }),
  );
  const produto = await json(
    await fetch(`${origem}/api/produtos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nome,
        categoria_id: categoria.id,
        preco: 1.5,
        custo: 0.3,
      }),
    }),
  );
  return { categoria, produto };
}

describe('HTTP POST /api/producao', () => {
  test('lança produção e incrementa produzido no estoque do dia', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const { produto } = await criarProduto(origem, headers);

      const criada = await fetch(`${origem}/api/producao`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ produto_id: produto.id, data: '2026-08-22', quantidade: 40 }),
      });
      const corpo = await json(criada);
      assert.equal(criada.status, 200);
      assert.equal(corpo.quantidade, 40);
      assert.ok(corpo.usuario_id);

      const estoque = await json(
        await fetch(`${origem}/api/estoque?produto_id=${produto.id}&data=2026-08-22`, { headers }),
      );
      assert.equal(estoque.data[0].produzido, 40);
      assert.equal(estoque.data[0].disponivel, 40);
    });
  });

  test('dois lançamentos do mesmo produto/dia somam, nunca sobrescrevem', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const { produto } = await criarProduto(origem, headers);

      await fetch(`${origem}/api/producao`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ produto_id: produto.id, data: '2026-08-22', quantidade: 20 }),
      });
      await fetch(`${origem}/api/producao`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ produto_id: produto.id, data: '2026-08-22', quantidade: 15 }),
      });

      const estoque = await json(
        await fetch(`${origem}/api/estoque?produto_id=${produto.id}&data=2026-08-22`, { headers }),
      );
      assert.equal(estoque.data[0].produzido, 35);
    });
  });

  test('quantidade <= 0 é rejeitada com 400, nenhum registro é criado', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const { produto } = await criarProduto(origem, headers);

      const resposta = await fetch(`${origem}/api/producao`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ produto_id: produto.id, data: '2026-08-22', quantidade: 0 }),
      });
      assert.equal(resposta.status, 400);

      const lista = await json(
        await fetch(`${origem}/api/producao?produto_id=${produto.id}`, { headers }),
      );
      assert.equal(lista.data.length, 0);
    });
  });

  test('produto inexistente retorna 404', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const resposta = await fetch(`${origem}/api/producao`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ produto_id: 9999, data: '2026-08-22', quantidade: 10 }),
      });
      assert.equal(resposta.status, 404);
    });
  });

  test('sem token retorna 401', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/producao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto_id: 1, data: '2026-08-22', quantidade: 10 }),
      });
      assert.equal(resposta.status, 401);
    });
  });
});

describe('HTTP GET /api/producao', () => {
  test('lista com paginação padrão e filtro por período/produto', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token, admin } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const { produto } = await criarProduto(origem, headers);

      await ctx.producaoRepository.salvar(
        new Producao({ produtoId: produto.id, data: '2026-08-22', quantidade: 40, usuarioId: admin.id }),
      );
      await ctx.producaoRepository.salvar(
        new Producao({ produtoId: produto.id, data: '2026-08-10', quantidade: 12, usuarioId: admin.id }),
      );

      const resposta = await fetch(
        `${origem}/api/producao?produto_id=${produto.id}&data_inicio=2026-08-20&data_fim=2026-08-22&page=1&limit=20`,
        { headers },
      );
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.data.length, 1);
      assert.equal(corpo.data[0].produto, 'Pão Francês');
      assert.equal(corpo.data[0].quantidade, 40);
      assert.equal(corpo.data[0].usuario, 'Administrador');
      assert.equal(corpo.pagination.total, 1);
    });
  });

  test('lista vazia retorna paginação consistente', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/producao`, { headers });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.deepEqual(corpo.data, []);
      assert.equal(corpo.pagination.limit, 20);
      assert.equal(corpo.pagination.total, 0);
    });
  });
});
