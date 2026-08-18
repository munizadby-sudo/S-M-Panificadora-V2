import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CaixaTurno } from '../../src/modules/cash-register/domain/CaixaTurno.js';
import { EstoqueDiario, dataHoje } from '../../src/modules/inventory/domain/EstoqueDiario.js';
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

async function criarProduto(origem, headers, nome = 'Pão Francês', preco = 1.5) {
  const categoria = await json(
    await fetch(`${origem}/api/categorias`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome: `Cat ${nome}` }),
    }),
  );
  const produto = await json(
    await fetch(`${origem}/api/produtos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nome,
        categoria_id: categoria.id,
        preco,
        custo: 0.3,
      }),
    }),
  );
  return { categoria, produto };
}

async function abrirCaixa(origem, headers) {
  return json(
    await fetch(`${origem}/api/caixa-turno/abrir`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fundo_especie: 40, fundo_moedas: 10 }),
    }),
  );
}

async function fecharCaixa(origem, headers, turnoId) {
  return fetch(`${origem}/api/caixa-turno/fechar`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      turno_id: turnoId,
      contado_dinheiro: 40,
      contado_moedas: 10,
      contado_pix: 0,
      contado_cartao: 0,
      observacao: '',
      sem_impressao: true,
    }),
  });
}

describe('HTTP /api/vendas', () => {
  test('POST com turno aberto debita estoque e lança fluxo_caixa', async () => {
    const ctx = montarAppMemoria();
    const dia = dataHoje();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers);

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produto.id, data: dia, inicial: 20 }),
      );

      const turno = await abrirCaixa(origem, headers);
      const resposta = await fetch(`${origem}/api/vendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          forma_pagamento: 'dinheiro',
          itens: [{ produto_id: produto.id, quantidade: 3 }],
        }),
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.status, 'confirmada');
      assert.equal(corpo.total, 4.5);
      assert.equal(corpo.forma_pagamento, 'dinheiro');
      assert.ok(corpo.numero >= 1);

      const estoque = await ctx.estoqueRepository.buscarPorProdutoEData(produto.id, dia);
      assert.equal(estoque.vendido, 3);
      assert.equal(estoque.disponivel(), 17);

      const lancamento = ctx.fluxoCaixaRepository.lancamentos.find(
        (item) => item.categoria === 'vendas' && item.vendaId === corpo.id,
      );
      assert.ok(lancamento);
      assert.equal(lancamento.turnoId, turno.id);
      assert.equal(lancamento.valor, 4.5);
      assert.equal(lancamento.forma, 'dinheiro');
    });
  });

  test('POST sem turno aberto retorna 403 CAIXA_FECHADO sem escrever nada', async () => {
    const ctx = montarAppMemoria();
    const dia = dataHoje();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers, 'Pão Sem Turno');

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produto.id, data: dia, inicial: 10 }),
      );

      const resposta = await fetch(`${origem}/api/vendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          forma_pagamento: 'pix',
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 403);
      assert.equal(corpo.codigo, 'CAIXA_FECHADO');
      assert.equal(ctx.vendaRepository.vendas.length, 0);
      assert.equal(ctx.fluxoCaixaRepository.lancamentos.length, 0);

      const estoque = await ctx.estoqueRepository.buscarPorProdutoEData(produto.id, dia);
      assert.equal(estoque.vendido, 0);
    });
  });

  test('POST com estoque insuficiente não persiste venda nem débitos parciais', async () => {
    const ctx = montarAppMemoria();
    const dia = dataHoje();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto: produtoA } = await criarProduto(origem, headers, 'Produto A', 2);
      const { produto: produtoB } = await criarProduto(origem, headers, 'Produto B', 3);

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produtoA.id, data: dia, inicial: 10 }),
      );
      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produtoB.id, data: dia, inicial: 1 }),
      );

      await abrirCaixa(origem, headers);

      const resposta = await fetch(`${origem}/api/vendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          forma_pagamento: 'dinheiro',
          itens: [
            { produto_id: produtoA.id, quantidade: 2 },
            { produto_id: produtoB.id, quantidade: 5 },
          ],
        }),
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 400);
      assert.match(corpo.erro, new RegExp(`produto_id=${produtoB.id}`));
      assert.equal(ctx.vendaRepository.vendas.length, 0);
      assert.equal(ctx.fluxoCaixaRepository.lancamentos.length, 0);

      const estoqueA = await ctx.estoqueRepository.buscarPorProdutoEData(produtoA.id, dia);
      const estoqueB = await ctx.estoqueRepository.buscarPorProdutoEData(produtoB.id, dia);
      assert.equal(estoqueA.vendido, 0);
      assert.equal(estoqueB.vendido, 0);
    });
  });

  test('GET /api/vendas é paginado com limite padrão 20', async () => {
    const ctx = montarAppMemoria();
    const dia = dataHoje();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers, 'Pão Listagem');

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produto.id, data: dia, inicial: 100 }),
      );
      await abrirCaixa(origem, headers);

      await fetch(`${origem}/api/vendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          forma_pagamento: 'dinheiro',
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });

      const resposta = await fetch(`${origem}/api/vendas`, { headers });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.data.length, 1);
      assert.equal(corpo.pagination.limit, 20);
      assert.equal(corpo.pagination.total, 1);
    });
  });

  test('DELETE cancela diretamente com turno aberto', async () => {
    const ctx = montarAppMemoria();
    const dia = dataHoje();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers, 'Pão Cancelar');

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produto.id, data: dia, inicial: 10 }),
      );
      await abrirCaixa(origem, headers);

      const venda = await json(
        await fetch(`${origem}/api/vendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            forma_pagamento: 'dinheiro',
            itens: [{ produto_id: produto.id, quantidade: 4 }],
          }),
        }),
      );

      const cancelamento = await fetch(`${origem}/api/vendas/${venda.id}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ motivo: 'Item lançado em dobro' }),
      });
      const corpo = await json(cancelamento);

      assert.equal(cancelamento.status, 200);
      assert.deepEqual(corpo, { status: 'cancelada', tipo: 'cancelamento_direto' });

      const vendaDb = await ctx.vendaRepository.buscarPorId(venda.id);
      assert.equal(vendaDb.status, 'cancelada');

      const estoque = await ctx.estoqueRepository.buscarPorProdutoEData(produto.id, dia);
      assert.equal(estoque.vendido, 0);

      const estorno = ctx.fluxoCaixaRepository.lancamentos.find(
        (item) => item.categoria === 'estorno' && item.vendaId === venda.id,
      );
      assert.ok(estorno);
    });
  });

  test('DELETE com turno fechado cria correcao_pendente; resolver ajusta turno atual', async () => {
    const ctx = montarAppMemoria();
    const dia = dataHoje();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const { produto } = await criarProduto(origem, headers, 'Pão Correção');

      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produto.id, data: dia, inicial: 10 }),
      );

      const turnoAntigo = await abrirCaixa(origem, headers);
      const venda = await json(
        await fetch(`${origem}/api/vendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            forma_pagamento: 'pix',
            itens: [{ produto_id: produto.id, quantidade: 2 }],
          }),
        }),
      );

      await fecharCaixa(origem, headers, turnoAntigo.id);

      const solicitacao = await fetch(`${origem}/api/vendas/${venda.id}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ motivo: 'Venda duplicada no turno anterior' }),
      });
      const corpoSolicitacao = await json(solicitacao);

      assert.equal(solicitacao.status, 200);
      assert.equal(corpoSolicitacao.tipo, 'correcao_pendente');
      assert.ok(corpoSolicitacao.correcao_id);

      const vendaAposSolicitacao = await ctx.vendaRepository.buscarPorId(venda.id);
      assert.equal(vendaAposSolicitacao.status, 'confirmada');

      const turnoNovo = await ctx.caixaTurnoRepository.salvar(
        new CaixaTurno({
          data: '2099-01-02',
          periodo: 'manha',
          status: 'aberto',
          abertoPor: 1,
          fundoEspecie: 0,
          fundoMoedas: 0,
        }),
      );
      assert.notEqual(turnoNovo.id, turnoAntigo.id);

      const resolucao = await fetch(
        `${origem}/api/vendas/correcoes/${corpoSolicitacao.correcao_id}/resolver`,
        { method: 'POST', headers },
      );
      const corpoResolucao = await json(resolucao);

      assert.equal(resolucao.status, 200);
      assert.equal(corpoResolucao.status, 'resolvida');
      assert.equal(corpoResolucao.turno_id, turnoNovo.id);

      const vendaCancelada = await ctx.vendaRepository.buscarPorId(venda.id);
      assert.equal(vendaCancelada.status, 'cancelada');

      const estoque = await ctx.estoqueRepository.buscarPorProdutoEData(produto.id, dia);
      assert.equal(estoque.vendido, 0);

      const ajuste = ctx.fluxoCaixaRepository.lancamentos.find(
        (item) =>
          item.categoria === 'correcao_venda_anterior' &&
          item.vendaId === venda.id &&
          item.turnoId === turnoNovo.id,
      );
      assert.ok(ajuste);
      assert.equal(ajuste.turnoId, turnoNovo.id);
      assert.notEqual(ajuste.turnoId, turnoAntigo.id);
    });
  });
});
