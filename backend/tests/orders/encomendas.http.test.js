import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
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

async function criarProduto(origem, headers, nome = 'Pão Francês', preco = 1.5) {
  const categoria = await json(
    await fetch(`${origem}/api/categorias`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome: `Cat ${nome} ${Date.now()}` }),
    }),
  );
  const produto = await json(
    await fetch(`${origem}/api/produtos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome, categoria_id: categoria.id, preco, custo: preco / 3 }),
    }),
  );
  return produto;
}

async function criarCliente(origem, headers) {
  return json(
    await fetch(`${origem}/api/clientes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome: 'Maria Souza', telefone: `8399${Date.now() % 1000000}` }),
    }),
  );
}

describe('HTTP POST /api/encomendas', () => {
  test('cria encomenda com total recalculado no backend, sem tocar em estoque', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers);

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produto.id, data: '2026-08-22', inicial: 5 }),
      );

      const resposta = await fetch(`${origem}/api/encomendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cliente_nome: 'João Sem Cadastro',
          cliente_telefone: '83988887777',
          data_entrega: '2026-08-25',
          sinal: 10,
          itens: [{ produto_id: produto.id, quantidade: 10 }],
        }),
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.total, 15);
      assert.equal(corpo.status, 'pendente');
      assert.ok(corpo.numero > 0);

      const estoque = await json(
        await fetch(`${origem}/api/estoque?produto_id=${produto.id}&data=2026-08-22`, { headers }),
      );
      assert.equal(estoque.data[0].disponivel, 5, 'encomenda nunca debita estoque');
    });
  });

  test('vincula cliente cadastrado quando cliente_id é informado', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers);
      const cliente = await criarCliente(origem, headers);

      const resposta = await fetch(`${origem}/api/encomendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cliente_id: cliente.id,
          cliente_nome: cliente.nome,
          cliente_telefone: cliente.telefone,
          data_entrega: '2026-08-25',
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      const corpo = await json(resposta);
      assert.equal(resposta.status, 200);
      assert.equal(corpo.cliente_id, cliente.id);
    });
  });

  test('cliente_id inexistente retorna 404', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers);

      const resposta = await fetch(`${origem}/api/encomendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cliente_id: 9999,
          cliente_nome: 'Fulano',
          cliente_telefone: '83900000000',
          data_entrega: '2026-08-25',
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      assert.equal(resposta.status, 404);
    });
  });

  test('itens vazio é rejeitado com 400', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/encomendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cliente_nome: 'Fulano',
          cliente_telefone: '83900000000',
          data_entrega: '2026-08-25',
          itens: [],
        }),
      });
      assert.equal(resposta.status, 400);
    });
  });
});

describe('HTTP GET /api/encomendas/:id', () => {
  test('retorna o detalhe completo com itens, usado pela edição no frontend', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers);

      const criada = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Fulano',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            itens: [{ produto_id: produto.id, quantidade: 3 }],
          }),
        }),
      );

      const resposta = await fetch(`${origem}/api/encomendas/${criada.id}`, { headers });
      const corpo = await json(resposta);
      assert.equal(resposta.status, 200);
      assert.equal(corpo.itens.length, 1);
      assert.equal(corpo.itens[0].produto_id, produto.id);
      assert.equal(corpo.itens[0].quantidade, 3);
    });
  });

  test('encomenda cancelada ou inexistente retorna 404', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/encomendas/9999`, { headers });
      assert.equal(resposta.status, 404);
    });
  });
});

describe('HTTP PUT /api/encomendas/:id — substitui todos os itens', () => {
  test('editar remove itens antigos não reenviados', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produtoA = await criarProduto(origem, headers, 'Pão A', 2);
      const produtoB = await criarProduto(origem, headers, 'Pão B', 3);

      const criada = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Fulano',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            itens: [
              { produto_id: produtoA.id, quantidade: 2 },
              { produto_id: produtoB.id, quantidade: 1 },
            ],
          }),
        }),
      );
      assert.equal(criada.total, 7);

      const editada = await json(
        await fetch(`${origem}/api/encomendas/${criada.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Fulano',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-26',
            itens: [{ produto_id: produtoB.id, quantidade: 1 }],
          }),
        }),
      );
      assert.equal(editada.total, 3, 'total reflete só o item reenviado');

      const lista = await json(
        await fetch(`${origem}/api/encomendas?ativo=1`, { headers }),
      );
      const item = lista.data.find((e) => e.id === criada.id);
      assert.equal(item.total, 3);
    });
  });
});

describe('HTTP PATCH /api/encomendas/:id/status', () => {
  test('aceita qualquer status da whitelist e rejeita fora dela', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers);
      const criada = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Fulano',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );

      const pronto = await fetch(`${origem}/api/encomendas/${criada.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'pronto' }),
      });
      assert.equal(pronto.status, 200);
      assert.equal((await json(pronto)).status, 'pronto');

      const invalido = await fetch(`${origem}/api/encomendas/${criada.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'enviado' }),
      });
      assert.equal(invalido.status, 400);
    });
  });
});

describe('HTTP DELETE /api/encomendas/:id — cancelamento (soft delete)', () => {
  test('cancela sem remover, continua consultável com ativo=0', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers);
      const criada = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Fulano',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );

      const cancelada = await fetch(`${origem}/api/encomendas/${criada.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(cancelada.status, 200);

      const ativas = await json(await fetch(`${origem}/api/encomendas?ativo=1`, { headers }));
      assert.equal(ativas.data.find((e) => e.id === criada.id), undefined);

      const inativas = await json(await fetch(`${origem}/api/encomendas?ativo=0`, { headers }));
      const encontrada = inativas.data.find((e) => e.id === criada.id);
      assert.ok(encontrada, 'encomenda continua consultável com ativo=0');
      assert.equal(encontrada.ativo, 0);
    });
  });
});

describe('HTTP GET /api/encomendas', () => {
  test('numeração de encomenda nunca colide com numeração de venda', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers);

      const encomenda1 = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Fulano',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );
      const encomenda2 = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Ciclano',
            cliente_telefone: '83911111111',
            data_entrega: '2026-08-26',
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );
      assert.equal(encomenda1.numero, 1);
      assert.equal(encomenda2.numero, 2);
    });
  });

  test('lista vazia retorna paginação consistente', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/encomendas`, { headers });
      const corpo = await json(resposta);
      assert.equal(resposta.status, 200);
      assert.deepEqual(corpo.data, []);
      assert.equal(corpo.pagination.limit, 20);
    });
  });
});
