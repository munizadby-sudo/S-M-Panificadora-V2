import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calcularFechamento } from '../../src/modules/cash-register/domain/FechamentoCaixa.js';
import { EstoqueDiario, dataHoje } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
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
  return { token: (await json(resposta)).token };
}

async function tokenOperador(porta, ctx, username = 'caixa1') {
  await ctx.usuarioRepository.salvar(
    new Usuario({
      nome: 'Operador Caixa',
      username,
      senhaHash: await ctx.hashService.hash('senha123'),
      role: 'operador',
      permissoes: ['caixa', 'fluxo'],
    }),
  );
  const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, senha: 'senha123' }),
  });
  return { token: (await json(resposta)).token };
}

function headersJson(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function abrirCaixa(origem, headers, fundoEspecie = 40, fundoMoedas = 10) {
  return json(
    await fetch(`${origem}/api/caixa-turno/abrir`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fundo_especie: fundoEspecie, fundo_moedas: fundoMoedas }),
    }),
  );
}

async function criarProduto(origem, headers) {
  const categoria = await json(
    await fetch(`${origem}/api/categorias`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome: `Cat ${Date.now()}` }),
    }),
  );
  const produto = await json(
    await fetch(`${origem}/api/produtos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nome: `Prod ${Date.now()}`,
        categoria_id: categoria.id,
        preco: 2,
        custo: 0.5,
      }),
    }),
  );
  return produto;
}

describe('HTTP POST /api/fluxo-caixa', () => {
  test('cria lançamento manual no turno aberto', async () => {
    const ctx = montarAppMemoria();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = headersJson(token);
      const turno = await abrirCaixa(origem, headers);

      const resposta = await fetch(`${origem}/api/fluxo-caixa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo: 'saida',
          descricao: 'Compra de sacolas',
          categoria: 'suprimento',
          forma: 'dinheiro',
          valor: 25,
        }),
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.turno_id, turno.id);
      assert.equal(corpo.tipo, 'saida');
      assert.equal(corpo.valor, 25);
      assert.ok(corpo.id >= 1);

      const salvo = await ctx.lancamentoFluxoCaixaRepository.buscarPorId(corpo.id);
      assert.equal(salvo.turnoId, turno.id);
      assert.equal(salvo.geradoAuto, false);
    });
  });

  test('sem turno aberto retorna 403 CAIXA_FECHADO', async () => {
    const ctx = montarAppMemoria();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = headersJson(token);
      const antes = ctx.lancamentosFluxo.length;

      const resposta = await fetch(`${origem}/api/fluxo-caixa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo: 'entrada',
          descricao: 'Suprimento',
          categoria: 'suprimento',
          forma: 'dinheiro',
          valor: 10,
        }),
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 403);
      assert.equal(corpo.codigo, 'CAIXA_FECHADO');
      assert.equal(ctx.lancamentosFluxo.length, antes);
    });
  });

  test('valor ≤ 0 retorna 400', async () => {
    const ctx = montarAppMemoria();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = headersJson(token);
      await abrirCaixa(origem, headers);

      const resposta = await fetch(`${origem}/api/fluxo-caixa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo: 'entrada',
          descricao: 'Inválido',
          categoria: 'suprimento',
          forma: 'dinheiro',
          valor: 0,
        }),
      });

      assert.equal(resposta.status, 400);
    });
  });
});

describe('HTTP GET /api/fluxo-caixa', () => {
  test('lista por turno_id sem exigir data', async () => {
    const ctx = montarAppMemoria();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = headersJson(token);
      const turno = await abrirCaixa(origem, headers);

      const resposta = await fetch(`${origem}/api/fluxo-caixa?turno_id=${turno.id}&page=1&limit=20`, {
        headers,
      });
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200, JSON.stringify(corpo));
      assert.ok(Array.isArray(corpo.data));
      assert.equal(corpo.pagination.page, 1);
    });
  });

  test('lista paginada com filtros por turno e categoria', async () => {
    const ctx = montarAppMemoria();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = headersJson(token);
      const turno = await abrirCaixa(origem, headers);

      await fetch(`${origem}/api/fluxo-caixa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo: 'saida',
          descricao: 'Sangria',
          categoria: 'sangria',
          forma: 'dinheiro',
          valor: 15,
        }),
      });
      await fetch(`${origem}/api/fluxo-caixa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo: 'entrada',
          descricao: 'Suprimento',
          categoria: 'suprimento',
          forma: 'pix',
          valor: 20,
        }),
      });

      const resposta = await fetch(
        `${origem}/api/fluxo-caixa?turno_id=${turno.id}&categoria=sangria&tipo=saida&page=1&limit=20`,
        { headers },
      );
      const corpo = await json(resposta);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.data.length, 1);
      assert.equal(corpo.data[0].categoria, 'sangria');
      assert.equal(corpo.data[0].tipo, 'saida');
      assert.equal(corpo.pagination.total, 1);
      assert.equal(corpo.pagination.page, 1);
      assert.equal(corpo.pagination.limit, 20);
    });
  });
});

describe('HTTP DELETE /api/fluxo-caixa/:id', () => {
  test('operador exclui manual; bloqueia automático; admin exclui automático', async () => {
    const ctx = montarAppMemoria();
    const dia = dataHoje();

    await comServidor(ctx.app, async (porta) => {
      const { token: tokenAdminUser } = await tokenAdmin(porta, ctx);
      const { token: tokenOperadorUser } = await tokenOperador(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headersAdmin = headersJson(tokenAdminUser);
      const headersOperador = headersJson(tokenOperadorUser);
      const headersCaixa = headersAdmin;

      const produto = await criarProduto(origem, headersAdmin);
      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produto.id, data: dia, inicial: 50 }),
      );
      const turno = await abrirCaixa(origem, headersCaixa);

      const manual = await json(
        await fetch(`${origem}/api/fluxo-caixa`, {
          method: 'POST',
          headers: headersOperador,
          body: JSON.stringify({
            tipo: 'saida',
            descricao: 'Sangria teste',
            categoria: 'sangria',
            forma: 'dinheiro',
            valor: 5,
          }),
        }),
      );

      const excluirManual = await fetch(`${origem}/api/fluxo-caixa/${manual.id}`, {
        method: 'DELETE',
        headers: headersOperador,
        body: JSON.stringify({ motivo: 'Lançamento duplicado por engano' }),
      });
      assert.equal(excluirManual.status, 200);
      const manualDepois = await ctx.lancamentoFluxoCaixaRepository.buscarPorId(manual.id);
      assert.equal(manualDepois.ativo, false);
      assert.equal(manualDepois.motivoExclusao, 'Lançamento duplicado por engano');

      const venda = await json(
        await fetch(`${origem}/api/vendas`, {
          method: 'POST',
          headers: headersCaixa,
          body: JSON.stringify({
            forma_pagamento: 'pix',
            itens: [{ produto_id: produto.id, quantidade: 1 }],
          }),
        }),
      );
      const auto = ctx.lancamentosFluxo.find(
        (item) => item.geradoAuto && item.vendaId === venda.id,
      );
      assert.ok(auto);

      const bloqueio = await fetch(`${origem}/api/fluxo-caixa/${auto.id}`, {
        method: 'DELETE',
        headers: headersOperador,
        body: JSON.stringify({ motivo: 'Tentativa operador' }),
      });
      const bloqueioCorpo = await json(bloqueio);
      assert.equal(bloqueio.status, 403);
      assert.equal(bloqueioCorpo.codigo, 'EXCLUSAO_AUTOMATICO_NAO_PERMITIDA');

      const adminExclui = await fetch(`${origem}/api/fluxo-caixa/${auto.id}`, {
        method: 'DELETE',
        headers: headersAdmin,
        body: JSON.stringify({ motivo: 'Ajuste administrativo' }),
      });
      assert.equal(adminExclui.status, 200);
      const autoDepois = await ctx.lancamentoFluxoCaixaRepository.buscarPorId(auto.id);
      assert.equal(autoDepois.ativo, false);

      assert.equal(
        ctx.lancamentosFluxo.filter((item) => item.id === auto.id).length,
        1,
        'não remove fisicamente',
      );
    });
  });
});

describe('HTTP GET /api/fluxo-caixa/resumo', () => {
  test('KPI de entrada inclui vendas e lançamento manual no mesmo turno', async () => {
    const ctx = montarAppMemoria();
    const dia = dataHoje();

    await comServidor(ctx.app, async (porta) => {
      const { token } = await tokenAdmin(porta, ctx);
      const origem = `http://127.0.0.1:${porta}`;
      const headers = headersJson(token);

      const produto = await criarProduto(origem, headers);
      await ctx.estoqueRepository.salvar(
        new EstoqueDiario({ produtoId: produto.id, data: dia, inicial: 20 }),
      );
      const turno = await abrirCaixa(origem, headers, 40, 10);

      await fetch(`${origem}/api/vendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          forma_pagamento: 'dinheiro',
          itens: [{ produto_id: produto.id, quantidade: 2 }],
        }),
      });
      await fetch(`${origem}/api/vendas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          forma_pagamento: 'pix',
          itens: [{ produto_id: produto.id, quantidade: 1 }],
        }),
      });

      const manualResposta = await fetch(`${origem}/api/fluxo-caixa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo: 'entrada',
          descricao: 'Suprimento de caixa',
          categoria: 'suprimento',
          forma: 'dinheiro',
          valor: 25,
        }),
      });
      const manual = await json(manualResposta);
      assert.equal(manualResposta.status, 200);
      assert.equal(manual.tipo, 'entrada');
      assert.equal(manual.valor, 25);

      const resumo = await json(
        await fetch(`${origem}/api/fluxo-caixa/resumo?turno_id=${turno.id}`, { headers }),
      );
      const preview = await json(
        await fetch(`${origem}/api/caixa-turno/preview-fechamento`, { headers }),
      );

      assert.equal(resumo.entradas.dinheiro, 29, '4 de vendas + 25 de suprimento');
      assert.equal(resumo.entradas.pix, 2);
      assert.equal(resumo.saidas.dinheiro, 0);

      const turnoAberto = await ctx.caixaTurnoRepository.buscarPorId(turno.id);
      const liquidoVendas = { dinheiro: 4, pix: 2, cartao: 0 };
      const { esperado } = calcularFechamento({
        fundoEspecie: turnoAberto.fundoEspecie,
        fundoMoedas: turnoAberto.fundoMoedas,
        totaisPorForma: [
          { forma: 'dinheiro', total: liquidoVendas.dinheiro },
          { forma: 'pix', total: liquidoVendas.pix },
          { forma: 'cartao', total: liquidoVendas.cartao },
        ],
      });

      assert.deepEqual(esperado, preview.esperado);
      assert.notEqual(
        resumo.entradas.dinheiro,
        liquidoVendas.dinheiro,
        'resumo do fluxo inclui manual; fechamento considera só vendas/estorno',
      );
    });
  });
});
