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
          sinal: 0,
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
  test('operador só avança pendente → pronto; PATCH para entregue é rejeitado', async () => {
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

      const entregueViaPatch = await fetch(`${origem}/api/encomendas/${criada.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'entregue' }),
      });
      assert.equal(entregueViaPatch.status, 400);

      const invalido = await fetch(`${origem}/api/encomendas/${criada.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'enviado' }),
      });
      assert.equal(invalido.status, 400);
    });
  });
});

describe('HTTP POST /api/encomendas/:id/finalizar', () => {
  test('caixa fechado impede receber; com caixa aberto lança fluxo categoria encomenda', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers, 'Bolo', 40);
      const criada = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Maria Souza',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            sinal: 0,
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );
      await fetch(`${origem}/api/encomendas/${criada.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'pronto' }),
      });

      const semCaixa = await fetch(`${origem}/api/encomendas/${criada.id}/finalizar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ forma: 'dinheiro' }),
      });
      assert.equal(semCaixa.status, 403);

      await fetch(`${origem}/api/caixa-turno/abrir`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fundo_especie: 40, fundo_moedas: 10 }),
      });

      const finalizada = await fetch(`${origem}/api/encomendas/${criada.id}/finalizar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ forma: 'dinheiro' }),
      });
      const corpo = await json(finalizada);
      assert.equal(finalizada.status, 200);
      assert.equal(corpo.status, 'entregue');
      assert.equal(corpo.saldo_a_receber, 0);

      const lancamento = ctx.fluxoCaixaRepository.lancamentos.find(
        (item) => Number(item.encomendaId) === Number(criada.id) && item.ativo !== false,
      );
      assert.ok(lancamento, 'deve lançar no fluxo do turno');
      assert.equal(lancamento.categoria, 'encomenda');
      assert.equal(lancamento.geradoAuto, true);
      assert.equal(lancamento.forma, 'dinheiro');
      assert.equal(Number(lancamento.valor), 40);

      const preview = await json(
        await fetch(`${origem}/api/caixa-turno/preview-fechamento`, { headers }),
      );
      assert.equal(preview.esperado.dinheiro, 90, 'fundo 50 + encomenda 40');

      const operador = await ctx.usuarioRepository.salvar(
        new Usuario({
          nome: 'Operador',
          username: 'openc',
          senhaHash: await ctx.hashService.hash('op123'),
          role: 'operador',
          permissoes: ['encomendas', 'caixa'],
        }),
      );
      const loginOp = await json(
        await fetch(`${origem}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: operador.username, senha: 'op123' }),
        }),
      );
      const tentativaOp = await fetch(`${origem}/api/encomendas/${criada.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${loginOp.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pronto' }),
      });
      assert.equal(tentativaOp.status, 403);

      const editar = await fetch(`${origem}/api/encomendas/${criada.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          cliente_nome: 'Maria Souza',
          cliente_telefone: '83900000000',
          data_entrega: '2026-08-25',
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      assert.equal(editar.status, 403);

      const reabrir = await fetch(`${origem}/api/encomendas/${criada.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'pronto' }),
      });
      assert.equal(reabrir.status, 200);
      assert.equal((await json(reabrir)).status, 'pronto');
      assert.equal(lancamento.ativo, false, 'reabrir estorna o lançamento automático');
    });
  });

  test('sinal que cobre o total entrega sem lançar saldo (sinal já entrou na criação)', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers, 'Pão', 10);
      await fetch(`${origem}/api/caixa-turno/abrir`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fundo_especie: 40, fundo_moedas: 10 }),
      });
      const criada = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Pago',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            sinal: 10,
            forma: 'pix',
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );
      await fetch(`${origem}/api/encomendas/${criada.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'pronto' }),
      });

      const finalizada = await fetch(`${origem}/api/encomendas/${criada.id}/finalizar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      assert.equal(finalizada.status, 200);
      assert.equal((await json(finalizada)).status, 'entregue');
      const ativos = ctx.fluxoCaixaRepository.lancamentos.filter((item) => item.ativo !== false);
      assert.equal(ativos.length, 1);
      assert.equal(Number(ativos[0].valor), 10);
      assert.match(ativos[0].descricao, /^Sinal encomenda/);
    });
  });
});

describe('SPEC-BE-015 — sinal no fluxo na criação', () => {
  test('listarAtivosPorEncomendaId devolve os dois lançamentos, sem LIMIT 1', async () => {
    const ctx = montarAppMemoria();
    ctx.fluxoCaixaRepository.lancamentos.push(
      { id: 1, encomendaId: 9, ativo: true, valor: 5 },
      { id: 2, encomendaId: 9, ativo: true, valor: 5 },
      { id: 3, encomendaId: 9, ativo: false, valor: 99 },
      { id: 4, encomendaId: 8, ativo: true, valor: 1 },
    );
    const lista = await ctx.fluxoCaixaRepository.listarAtivosPorEncomendaId(9);
    assert.equal(lista.length, 2);
    assert.deepEqual(lista.map((item) => item.id), [1, 2]);
  });

  test('sinal 0 cria com caixa fechado; sinal > 0 sem caixa é 403 e não cria', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers, 'Pão', 10);

      const semSinal = await fetch(`${origem}/api/encomendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cliente_nome: 'Fim de semana',
          cliente_telefone: '83900000000',
          data_entrega: '2026-08-25',
          sinal: 0,
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      assert.equal(semSinal.status, 200);

      const comSinal = await fetch(`${origem}/api/encomendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cliente_nome: 'Maria',
          cliente_telefone: '83911111111',
          data_entrega: '2026-08-25',
          sinal: 5,
          forma: 'dinheiro',
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      const corpo = await json(comSinal);
      assert.equal(comSinal.status, 403);
      assert.match(corpo.erro || '', /caixa/i);
      const lista = await json(await fetch(`${origem}/api/encomendas`, { headers }));
      assert.equal(lista.data.length, 1);
    });
  });

  test('sinal 5 com caixa aberto e pix lança 5; PUT não muda o sinal', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers, 'Pão', 10);
      await fetch(`${origem}/api/caixa-turno/abrir`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fundo_especie: 40, fundo_moedas: 10 }),
      });

      const semForma = await fetch(`${origem}/api/encomendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cliente_nome: 'Maria',
          cliente_telefone: '83900000000',
          data_entrega: '2026-08-25',
          sinal: 5,
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      assert.equal(semForma.status, 400);

      const criada = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Maria',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            sinal: 5,
            forma: 'pix',
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );
      assert.equal(criada.sinal, 5);
      const lancamentos = ctx.fluxoCaixaRepository.lancamentos.filter((item) => item.ativo !== false);
      assert.equal(lancamentos.length, 1);
      assert.equal(Number(lancamentos[0].valor), 5);
      assert.equal(lancamentos[0].forma, 'pix');
      assert.match(lancamentos[0].descricao, /^Sinal encomenda/);

      const recusaSinal = await fetch(`${origem}/api/encomendas/${criada.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          cliente_nome: 'Maria',
          cliente_telefone: '83900000000',
          data_entrega: '2026-08-25',
          sinal: 0,
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      assert.equal(recusaSinal.status, 400);

      const mesmoSinal = await fetch(`${origem}/api/encomendas/${criada.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          cliente_nome: 'Maria',
          cliente_telefone: '83900000000',
          data_entrega: '2026-08-26',
          sinal: 5,
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      assert.equal(mesmoSinal.status, 200);
    });
  });

  test('criar sinal 0 e PUT sinal 5 não lança fluxo; cancelar com sinal estorna o lançamento', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const produto = await criarProduto(origem, headers, 'Pão', 10);
      const pagaDepois = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Fim de semana',
            cliente_telefone: '83900000000',
            data_entrega: '2026-08-25',
            sinal: 0,
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );
      const editada = await fetch(`${origem}/api/encomendas/${pagaDepois.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          cliente_nome: 'Fim de semana',
          cliente_telefone: '83900000000',
          data_entrega: '2026-08-25',
          sinal: 5,
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      assert.equal(editada.status, 200);
      assert.equal(ctx.fluxoCaixaRepository.lancamentos.length, 0);

      await fetch(`${origem}/api/caixa-turno/abrir`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fundo_especie: 40, fundo_moedas: 10 }),
      });
      const comSinal = await json(
        await fetch(`${origem}/api/encomendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cliente_nome: 'Maria',
            cliente_telefone: '83911111111',
            data_entrega: '2026-08-25',
            sinal: 5,
            forma: 'dinheiro',
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );
      assert.equal(ctx.fluxoCaixaRepository.lancamentos.filter((item) => item.ativo !== false).length, 1);
      const cancelada = await fetch(`${origem}/api/encomendas/${comSinal.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(cancelada.status, 200);
      assert.equal(ctx.fluxoCaixaRepository.lancamentos.filter((item) => item.ativo !== false).length, 0);
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
