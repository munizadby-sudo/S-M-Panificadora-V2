import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Perda } from '../../src/modules/losses/domain/Perda.js';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
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

describe('HTTP GET /api/perdas', () => {
  test('lista vazia com page, limit e ativo=1', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const resposta = await fetch(
        `http://127.0.0.1:${porta}/api/perdas?page=1&limit=50&ativo=1`,
        { headers },
      );
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.deepEqual(corpo.data, []);
      assert.equal(corpo.pagination.page, 1);
      assert.equal(corpo.pagination.limit, 50);
      assert.equal(corpo.pagination.total, 0);
    });
  });

  test('lista sem filtros retorna 200 com paginação padrão', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/perdas`, { headers });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.ok(Array.isArray(corpo.data));
      assert.equal(corpo.pagination.limit, 20);
    });
  });

  test('filtra por período, produto e motivo', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token, admin } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const { produto } = await criarProduto(origem, headers);

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({
          produtoId: produto.id,
          data: '2026-08-17',
          inicial: 20,
        }),
      );

      await ctx.perdaRepository.salvar(
        new Perda({
          produtoId: produto.id,
          data: '2026-08-17',
          quantidade: 5,
          motivo: 'queimado',
          produtoCusto: 0.3,
          usuarioId: admin.id,
        }),
      );
      await ctx.perdaRepository.salvar(
        new Perda({
          produtoId: produto.id,
          data: '2026-08-10',
          quantidade: 2,
          motivo: 'sobra',
          produtoCusto: 0.3,
          usuarioId: admin.id,
        }),
      );

      const resposta = await fetch(
        `${origem}/api/perdas?produto_id=${produto.id}&motivo=queimado&data_inicio=2026-08-01&data_fim=2026-08-17&page=1&limit=50&ativo=1`,
        { headers },
      );
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.data.length, 1);
      assert.equal(corpo.data[0].produto, 'Pão Francês');
      assert.equal(corpo.data[0].motivo, 'queimado');
      assert.equal(corpo.data[0].quantidade, 5);
      assert.equal(corpo.data[0].usuario, 'Administrador');
      assert.equal(corpo.pagination.total, 1);
    });
  });
});

describe('HTTP POST /api/perdas', () => {
  test('cria perda, debita estoque e bloqueia quantidade acima do disponível', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const { produto } = await criarProduto(origem, headers);

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({
          produtoId: produto.id,
          data: '2026-08-17',
          inicial: 10,
        }),
      );

      const criada = await fetch(`${origem}/api/perdas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          produto_id: produto.id,
          data: '2026-08-17',
          quantidade: 4,
          motivo: 'vencido',
        }),
      });
      const corpoCriada = await json(criada);
      assert.equal(criada.status, 200);
      assert.equal(corpoCriada.custo_calculado, 1.2);

      const estoque = await json(
        await fetch(`${origem}/api/estoque?produto_id=${produto.id}&data=2026-08-17`, { headers }),
      );
      assert.equal(estoque.data[0].disponivel, 6);

      const excesso = await fetch(`${origem}/api/perdas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          produto_id: produto.id,
          data: '2026-08-17',
          quantidade: 99,
          motivo: 'danificado',
        }),
      });
      assert.equal(excesso.status, 400);

      const lista = await json(
        await fetch(`${origem}/api/perdas?produto_id=${produto.id}&ativo=1`, { headers }),
      );
      assert.equal(lista.data.length, 1);
    });
  });
});

describe('HTTP DELETE /api/perdas/:id', () => {
  test('admin estorna perda e reverte estoque na data original', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const { produto } = await criarProduto(origem, headers, 'Broa');

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({
          produtoId: produto.id,
          data: '2026-01-15',
          inicial: 8,
        }),
      );

      const criada = await fetch(`${origem}/api/perdas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          produto_id: produto.id,
          data: '2026-01-15',
          quantidade: 3,
          motivo: 'queimado',
        }),
      });
      const corpoCriada = await json(criada);
      assert.equal(criada.status, 200);

      const estorno = await fetch(`${origem}/api/perdas/${corpoCriada.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(estorno.status, 200);

      const estoque = await json(
        await fetch(`${origem}/api/estoque?produto_id=${produto.id}&data=2026-01-15`, { headers }),
      );
      assert.equal(estoque.data[0].vendido, 0);
      assert.equal(estoque.data[0].disponivel, 8);

      const estornadas = await json(
        await fetch(`${origem}/api/perdas?ativo=0&produto_id=${produto.id}`, { headers }),
      );
      assert.equal(estornadas.data.length, 1);
      assert.equal(estornadas.data[0].ativo, 0);
    });
  });
});
