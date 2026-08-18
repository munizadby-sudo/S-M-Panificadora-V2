import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

async function tokenAdmin(porta, ctx) {
  await ctx.usuarioRepository.salvar(
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
  return (await json(resposta)).token;
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
        custo: 0.4,
      }),
    }),
  );
  return { categoria, produto };
}

describe('HTTP GET /api/estoque', () => {
  test('lista o estoque do dia, criando o registro com rollover quando ainda não existe', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers);

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({
          produtoId: produto.id,
          data: '2026-08-16',
          inicial: 20,
          produzido: 50,
          vendido: 18,
          minimo: 10,
        }),
      );

      const resposta = await fetch(`${origem}/api/estoque?data=2026-08-17`, { headers });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.data.length, 1);
      assert.equal(corpo.data[0].produto_id, produto.id);
      assert.equal(corpo.data[0].nome, 'Pão Francês');
      assert.equal(corpo.data[0].data, '2026-08-17');
      assert.equal(corpo.data[0].inicial, 52);
      assert.equal(corpo.data[0].produzido, 0);
      assert.equal(corpo.data[0].vendido, 0);
      assert.equal(corpo.data[0].disponivel, 52);
      assert.equal(corpo.data[0].abaixo_do_minimo, false);
      assert.equal(corpo.pagination.total, 1);
    });
  });

  test('produto sem histórico aparece no dia com saldo zero', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers);

      const resposta = await fetch(`${origem}/api/estoque?data=2026-08-17&produto_id=${produto.id}`, {
        headers,
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.data.length, 1);
      assert.equal(corpo.data[0].inicial, 0);
      assert.equal(corpo.data[0].disponivel, 0);
    });
  });
});

describe('HTTP PUT /api/estoque/:produtoId e POST /api/estoque/lote', () => {
  test('upsert individual grava inicial/produzido/minimo e ignora vendido enviado no corpo', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers);

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({
          produtoId: produto.id,
          data: '2026-08-17',
          inicial: 8,
          produzido: 0,
          vendido: 3,
        }),
      );

      const resposta = await fetch(`${origem}/api/estoque/${produto.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          data: '2026-08-17',
          inicial: 20,
          produzido: 50,
          minimo: 10,
          vendido: 0,
        }),
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.inicial, 20);
      assert.equal(corpo.produzido, 50);
      assert.equal(corpo.vendido, 3);
      assert.equal(corpo.disponivel, 67);
      assert.equal(corpo.minimo, 10);
    });
  });

  test('upsert rejeita produto inexistente, inativo e valores negativos', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers);

      const inexistente = await fetch(`${origem}/api/estoque/9999`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: '2026-08-17', inicial: 1, produzido: 0 }),
      });
      assert.equal(inexistente.status, 404);

      const negativo = await fetch(`${origem}/api/estoque/${produto.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: '2026-08-17', inicial: -1, produzido: 0 }),
      });
      assert.equal(negativo.status, 400);

      await fetch(`${origem}/api/produtos/${produto.id}`, { method: 'DELETE', headers });
      const inativo = await fetch(`${origem}/api/estoque/${produto.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: '2026-08-17', inicial: 1, produzido: 0 }),
      });
      assert.equal(inativo.status, 400);
    });
  });

  test('lote aplica todos os itens e reverte tudo se um item falhar', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { categoria, produto: pao } = await criarProduto(origem, headers, 'Pão Francês');
      const broa = await json(
        await fetch(`${origem}/api/produtos`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: 'Broa',
            categoria_id: categoria.id,
            preco: 2,
            custo: 0.8,
          }),
        }),
      );

      await fetch(`${origem}/api/estoque/${pao.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: '2026-08-17', inicial: 5, produzido: 0 }),
      });

      const ok = await fetch(`${origem}/api/estoque/lote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: '2026-08-17',
          itens: [
            { produto_id: pao.id, inicial: 20, produzido: 50 },
            { produto_id: broa.id, inicial: 5, produzido: 30 },
          ],
        }),
      });
      const corpoOk = await json(ok);
      assert.equal(ok.status, 200);
      assert.equal(corpoOk.atualizados, 2);

      const falha = await fetch(`${origem}/api/estoque/lote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: '2026-08-17',
          itens: [
            { produto_id: pao.id, inicial: 99, produzido: 1 },
            { produto_id: 99999, inicial: 1, produzido: 0 },
          ],
        }),
      });
      const corpoFalha = await json(falha);
      assert.equal(falha.status, 404);
      assert.match(String(corpoFalha.erro), /99999/);

      const listagem = await json(
        await fetch(`${origem}/api/estoque?data=2026-08-17&produto_id=${pao.id}`, { headers }),
      );
      assert.equal(listagem.data[0].inicial, 20);
      assert.equal(listagem.data[0].produzido, 50);
    });
  });
});
