import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { classificarCurvaABC } from '../../src/modules/reports/domain/classificarCurvaABC.js';
import { agruparPorHora } from '../../src/modules/reports/domain/agruparPorHora.js';
import { calcularStatusResumo } from '../../src/modules/reports/domain/calcularStatusResumo.js';
import { PeriodoInvalidoError } from '../../src/modules/reports/domain/erros.js';
import { validarPeriodo } from '../../src/modules/reports/application/validarPeriodo.js';
import { RelatorioVendas } from '../../src/modules/reports/application/RelatorioVendas.js';
import { RelatorioVendasPorHora } from '../../src/modules/reports/application/RelatorioVendasPorHora.js';
import { RelatorioFechamentoCaixa } from '../../src/modules/reports/application/RelatorioFechamentoCaixa.js';
import { CurvaABCProdutos } from '../../src/modules/reports/application/CurvaABCProdutos.js';
import { RelatorioResultado } from '../../src/modules/reports/application/RelatorioResultado.js';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizReports = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'modules', 'reports');

describe('domínio — classificarCurvaABC', () => {
  test('lista vazia retorna []', () => {
    assert.deepEqual(classificarCurvaABC([]), []);
  });

  test('percentual exatamente 80% permanece em A', () => {
    const resultado = classificarCurvaABC([
      { produto: 'A', quantidade: 1, receita: 80 },
      { produto: 'B', quantidade: 1, receita: 20 },
    ]);
    assert.equal(resultado[0].classe, 'A');
    assert.equal(resultado[0].percentual_acumulado, 80);
    // 100% acumulado → C (acima de 95%)
    assert.equal(resultado[1].classe, 'C');
  });

  test('produto que cruza 80% entra em B, nunca em A', () => {
    const resultado = classificarCurvaABC([
      { produto: 'A', quantidade: 1, receita: 70 },
      { produto: 'B', quantidade: 1, receita: 20 },
      { produto: 'C', quantidade: 1, receita: 10 },
    ]);
    assert.equal(resultado[0].classe, 'A');
    assert.equal(resultado[1].classe, 'B');
    assert.ok(resultado[1].percentual_acumulado > 80);
  });

  test('percentual exatamente 95% permanece em B', () => {
    const resultado = classificarCurvaABC([
      { produto: 'A', quantidade: 1, receita: 80 },
      { produto: 'B', quantidade: 1, receita: 15 },
      { produto: 'C', quantidade: 1, receita: 5 },
    ]);
    assert.equal(resultado[1].classe, 'B');
    assert.equal(resultado[1].percentual_acumulado, 95);
    assert.equal(resultado[2].classe, 'C');
  });
});

describe('domínio — calcularStatusResumo', () => {
  test('zero → bateu certo; positivo → sobra; negativo → falta', () => {
    assert.equal(calcularStatusResumo(0), 'bateu certo');
    assert.equal(calcularStatusResumo(1), 'sobra');
    assert.equal(calcularStatusResumo(-1), 'falta');
  });
});

describe('domínio — validarPeriodo', () => {
  test('data_inicio > data_fim lança PeriodoInvalidoError', () => {
    assert.throws(
      () => validarPeriodo({ data_inicio: '2026-08-20', data_fim: '2026-08-10' }),
      PeriodoInvalidoError,
    );
  });
});

function fakeVendaRepo(itens, pagamentos) {
  return {
    async listarItensConfirmadosNoPeriodo() {
      return itens;
    },
    async listarPagamentosConfirmadosNoPeriodo() {
      return pagamentos || itens.map((item) => ({ formaPagamento: item.formaPagamento, valor: item.subtotal }));
    },
  };
}

describe('casos de uso — relatórios', () => {
  test('RelatorioVendas agrega total, formas, produtos e KPIs', async () => {
    const resultado = await new RelatorioVendas({
      vendaRepository: fakeVendaRepo([
        {
          vendaId: 1,
          produtoId: 1,
          produtoNome: 'Pão',
          quantidade: 2,
          precoUnitario: 5,
          subtotal: 10,
          formaPagamento: 'dinheiro',
          dataOperacao: '2026-08-15',
          horaOperacao: 8,
        },
        {
          vendaId: 2,
          produtoId: 1,
          produtoNome: 'Pão',
          quantidade: 1,
          precoUnitario: 5,
          subtotal: 5,
          formaPagamento: 'pix',
          dataOperacao: '2026-08-15',
          horaOperacao: 9,
        },
      ]),
    }).executar({ data_inicio: '2026-08-15', data_fim: '2026-08-15' });

    assert.equal(resultado.total_geral, 15);
    assert.equal(resultado.quantidade_itens, 3);
    assert.equal(resultado.numero_vendas, 2);
    assert.equal(resultado.ticket_medio, 7.5);
    assert.equal(resultado.por_forma_pagamento.length, 2);
    assert.equal(resultado.por_produto[0].receita, 15);
  });

  test('RelatorioVendas: venda dividida soma cada forma separado, não "misto" (item 9)', async () => {
    const resultado = await new RelatorioVendas({
      vendaRepository: fakeVendaRepo(
        [
          {
            vendaId: 1,
            produtoId: 1,
            produtoNome: 'Pão',
            quantidade: 1,
            precoUnitario: 10,
            subtotal: 10,
            formaPagamento: 'misto',
            dataOperacao: '2026-08-15',
            horaOperacao: 8,
          },
        ],
        [
          { formaPagamento: 'dinheiro', valor: 6 },
          { formaPagamento: 'cartao', valor: 4 },
        ],
      ),
    }).executar({ data_inicio: '2026-08-15', data_fim: '2026-08-15' });

    assert.equal(resultado.total_geral, 10);
    assert.equal(resultado.por_forma_pagamento.length, 2);
    assert.equal(
      resultado.por_forma_pagamento.find((f) => f.forma_pagamento === 'dinheiro').total,
      6,
    );
    assert.equal(
      resultado.por_forma_pagamento.find((f) => f.forma_pagamento === 'cartao').total,
      4,
    );
    assert.ok(!resultado.por_forma_pagamento.some((f) => f.forma_pagamento === 'misto'));
  });

  test('RelatorioVendas: período vazio zera KPIs sem NaN', async () => {
    const resultado = await new RelatorioVendas({
      vendaRepository: fakeVendaRepo([]),
    }).executar({ data_inicio: '2026-08-15', data_fim: '2026-08-15' });

    assert.equal(resultado.total_geral, 0);
    assert.equal(resultado.quantidade_itens, 0);
    assert.equal(resultado.numero_vendas, 0);
    assert.equal(resultado.ticket_medio, 0);
    assert.equal(Number.isNaN(resultado.ticket_medio), false);
    assert.equal(Number.isFinite(resultado.ticket_medio), true);
  });

  test('RelatorioVendas: numero_vendas conta vendas distintas, não itens', async () => {
    const resultado = await new RelatorioVendas({
      vendaRepository: fakeVendaRepo([
        {
          vendaId: 10,
          produtoId: 1,
          produtoNome: 'Pão',
          quantidade: 2,
          precoUnitario: 5,
          subtotal: 10,
          formaPagamento: 'dinheiro',
          dataOperacao: '2026-08-15',
          horaOperacao: 10,
        },
        {
          vendaId: 10,
          produtoId: 2,
          produtoNome: 'Bolo',
          quantidade: 3,
          precoUnitario: 8,
          subtotal: 24,
          formaPagamento: 'dinheiro',
          dataOperacao: '2026-08-15',
          horaOperacao: 10,
        },
      ]),
    }).executar({ data_inicio: '2026-08-15', data_fim: '2026-08-15' });

    assert.equal(resultado.numero_vendas, 1);
    assert.equal(resultado.quantidade_itens, 5);
    assert.equal(resultado.total_geral, 34);
    assert.equal(resultado.ticket_medio, 34);
    assert.equal(
      resultado.por_produto.reduce((s, p) => s + p.quantidade, 0),
      resultado.quantidade_itens,
    );
  });

  test('agruparPorHora preenche zeros entre min e max e ignora faixa fixa', () => {
    assert.deepEqual(agruparPorHora([]), []);
    const resultado = agruparPorHora([
      {
        vendaId: 1,
        horaOperacao: 7,
        quantidade: 2,
        subtotal: 10,
      },
      {
        vendaId: 2,
        horaOperacao: 9,
        quantidade: 1,
        subtotal: 5,
      },
      {
        vendaId: 3,
        horaOperacao: 23,
        quantidade: 4,
        subtotal: 20,
      },
    ]);
    assert.deepEqual(
      resultado.map((item) => item.hora),
      [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    );
    assert.equal(resultado.find((item) => item.hora === 8).quantidade, 0);
    assert.equal(resultado.find((item) => item.hora === 8).receita, 0);
    assert.equal(resultado.find((item) => item.hora === 23).quantidade, 4);
    assert.equal(resultado.find((item) => item.hora === 23).receita, 20);
  });

  test('RelatorioVendasPorHora usa a mesma fonte e soma receita = total_geral', async () => {
    const itens = [
      {
        vendaId: 1,
        produtoId: 1,
        produtoNome: 'Pão',
        quantidade: 2,
        precoUnitario: 5,
        subtotal: 10,
        formaPagamento: 'dinheiro',
        dataOperacao: '2026-08-15',
        horaOperacao: 8,
      },
      {
        vendaId: 2,
        produtoId: 1,
        produtoNome: 'Pão',
        quantidade: 1,
        precoUnitario: 5,
        subtotal: 5,
        formaPagamento: 'pix',
        dataOperacao: '2026-08-15',
        horaOperacao: 10,
      },
    ];
    const repo = fakeVendaRepo(itens);
    const vendas = await new RelatorioVendas({ vendaRepository: repo }).executar({
      data_inicio: '2026-08-15',
      data_fim: '2026-08-15',
    });
    const porHora = await new RelatorioVendasPorHora({ vendaRepository: repo }).executar({
      data_inicio: '2026-08-15',
      data_fim: '2026-08-15',
    });

    assert.deepEqual(
      porHora.por_hora.map((item) => item.hora),
      [8, 9, 10],
    );
    assert.equal(porHora.por_hora.find((item) => item.hora === 9).receita, 0);
    assert.equal(
      porHora.por_hora.reduce((s, item) => s + item.receita, 0),
      vendas.total_geral,
    );
  });

  test('RelatorioVendasPorHora: período vazio retorna por_hora []', async () => {
    const resultado = await new RelatorioVendasPorHora({
      vendaRepository: fakeVendaRepo([]),
    }).executar({ data_inicio: '2026-08-15', data_fim: '2026-08-15' });
    assert.deepEqual(resultado.por_hora, []);
  });

  test('código de agruparPorHora não tem faixa fixa de horas', () => {
    const fonte = readFileSync(join(raizReports, 'domain', 'agruparPorHora.js'), 'utf8');
    assert.doesNotMatch(fonte, /6\s*,\s*19|horaMin\s*=\s*6|horaMax\s*=\s*19/);
    assert.doesNotMatch(fonte, /for\s*\(\s*let\s+hora\s*=\s*0\s*;\s*hora\s*<=\s*23/);
  });

  test('CurvaABC: soma das receitas bate com total_geral', async () => {
    const itens = [
      {
        vendaId: 1,
        produtoId: 1,
        produtoNome: 'A',
        quantidade: 1,
        precoUnitario: 80,
        subtotal: 80,
        formaPagamento: 'pix',
        dataOperacao: '2026-08-15',
      },
      {
        vendaId: 1,
        produtoId: 2,
        produtoNome: 'B',
        quantidade: 1,
        precoUnitario: 20,
        subtotal: 20,
        formaPagamento: 'pix',
        dataOperacao: '2026-08-15',
      },
    ];
    const repo = fakeVendaRepo(itens);
    const vendas = await new RelatorioVendas({ vendaRepository: repo }).executar({
      data_inicio: '2026-08-15',
      data_fim: '2026-08-15',
    });
    const abc = await new CurvaABCProdutos({ vendaRepository: repo }).executar({
      data_inicio: '2026-08-15',
      data_fim: '2026-08-15',
    });
    assert.equal(
      abc.por_receita.reduce((s, i) => s + i.receita, 0),
      vendas.total_geral,
    );
  });

  test('RelatorioFechamentoCaixa deriva status_resumo e não recalcula diferença', async () => {
    const caixaTurnoRepository = {
      async listarFechadosNoPeriodo() {
        return [
          {
            id: 1,
            data: '2026-08-15',
            periodo: 'tarde',
            esperado: { dinheiro: 100, pix: 50, cartao: 0 },
            contado: { dinheiro: 100, moedas: 0, pix: 40, cartao: 0 },
            diferenca: { dinheiro: 0, pix: -10, cartao: 0, total: -10 },
          },
        ];
      },
    };
    const resultado = await new RelatorioFechamentoCaixa({ caixaTurnoRepository }).executar({
      data_inicio: '2026-08-15',
      data_fim: '2026-08-15',
    });
    assert.equal(resultado.turnos[0].status_resumo, 'falta');
    assert.equal(resultado.resumo_periodo.diferenca_total, -10);
  });

  test('RelatorioResultado soma entradas/saídas de todas as categorias', async () => {
    const resultado = await new RelatorioResultado({
      lancamentoFluxoCaixaRepository: {
        async listarAtivosNoPeriodo() {
          return [
            { tipo: 'entrada', categoria: 'vendas', valor: 100 },
            { tipo: 'saida', categoria: 'sangria', valor: 30 },
            { tipo: 'entrada', categoria: 'suprimento', valor: 20 },
          ];
        },
      },
    }).executar({ data_inicio: '2026-08-15', data_fim: '2026-08-15' });

    assert.equal(resultado.total_entradas, 120);
    assert.equal(resultado.total_saidas, 30);
    assert.equal(resultado.resultado, 90);
    assert.equal(resultado.por_categoria.length, 3);
  });

  test('período inválido falha antes de consultar', async () => {
    await assert.rejects(
      () =>
        new RelatorioVendas({
          vendaRepository: {
            async listarItensConfirmadosNoPeriodo() {
              throw new Error('não deveria consultar');
            },
          },
        }).executar({ data_inicio: '2026-08-20', data_fim: '2026-08-10' }),
      PeriodoInvalidoError,
    );
  });
});

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

describe('HTTP GET /api/relatorios', () => {
  test('período inválido retorna 400 nos 5 endpoints', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const qs = 'data_inicio=2026-08-20&data_fim=2026-08-10';
      for (const caminho of [
        'vendas',
        'vendas-por-hora',
        'fechamento-caixa',
        'curva-abc',
        'resultado',
      ]) {
        const resposta = await fetch(`http://127.0.0.1:${porta}/api/relatorios/${caminho}?${qs}`, {
          headers,
        });
        assert.equal(resposta.status, 400, caminho);
      }
    });
  });

  test('endpoints respondem 200 com período válido (lista vazia)', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const qs = 'data_inicio=2026-08-15&data_fim=2026-08-15';

      const vendas = await fetch(`http://127.0.0.1:${porta}/api/relatorios/vendas?${qs}`, { headers });
      assert.equal(vendas.status, 200);
      const corpoVendas = await json(vendas);
      assert.equal(corpoVendas.total_geral, 0);
      assert.equal(corpoVendas.ticket_medio, 0);
      assert.equal(corpoVendas.numero_vendas, 0);
      assert.equal(corpoVendas.quantidade_itens, 0);

      const porHora = await fetch(
        `http://127.0.0.1:${porta}/api/relatorios/vendas-por-hora?${qs}`,
        { headers },
      );
      assert.equal(porHora.status, 200);
      assert.deepEqual((await json(porHora)).por_hora, []);

      const abc = await fetch(`http://127.0.0.1:${porta}/api/relatorios/curva-abc?${qs}`, { headers });
      assert.equal(abc.status, 200);
      const corpoAbc = await json(abc);
      assert.deepEqual(corpoAbc.por_receita, []);

      const fechamento = await fetch(
        `http://127.0.0.1:${porta}/api/relatorios/fechamento-caixa?${qs}`,
        { headers },
      );
      assert.equal(fechamento.status, 200);

      const resultado = await fetch(`http://127.0.0.1:${porta}/api/relatorios/resultado?${qs}`, {
        headers,
      });
      assert.equal(resultado.status, 200);
    });
  });

  test('vendas-por-hora agrega, preenche zeros e inclui venda às 23h', async () => {
    const ctx = montarAppMemoria();
    ctx.produtoRepository.itens.push({ id: 1, nome: 'Pão', ativo: 1 });
    ctx.vendaRepository.vendas.push({
      id: 1,
      status: 'confirmada',
      formaPagamento: 'dinheiro',
      dataOperacao: () => '2026-08-15',
      horaOperacao: () => 8,
      itens: [{ produtoId: 1, quantidade: 2, precoUnitario: 5, subtotal: 10 }],
    });
    ctx.vendaRepository.vendas.push({
      id: 2,
      status: 'confirmada',
      formaPagamento: 'pix',
      dataOperacao: () => '2026-08-15',
      horaOperacao: () => 10,
      itens: [{ produtoId: 1, quantidade: 1, precoUnitario: 5, subtotal: 5 }],
    });
    ctx.vendaRepository.vendas.push({
      id: 3,
      status: 'confirmada',
      formaPagamento: 'cartao',
      dataOperacao: () => '2026-08-15',
      horaOperacao: () => 23,
      itens: [{ produtoId: 1, quantidade: 3, precoUnitario: 4, subtotal: 12 }],
    });

    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const qs = 'data_inicio=2026-08-15&data_fim=2026-08-15';

      const vendas = await json(
        await fetch(`http://127.0.0.1:${porta}/api/relatorios/vendas?${qs}`, { headers }),
      );
      const porHora = await json(
        await fetch(`http://127.0.0.1:${porta}/api/relatorios/vendas-por-hora?${qs}`, { headers }),
      );

      assert.equal(vendas.numero_vendas, 3);
      assert.equal(vendas.quantidade_itens, 6);
      assert.equal(vendas.ticket_medio, 9);
      assert.ok(porHora.por_hora.some((item) => item.hora === 23 && item.receita === 12));
      assert.equal(porHora.por_hora.find((item) => item.hora === 9).quantidade, 0);
      assert.equal(
        porHora.por_hora.reduce((s, item) => s + item.receita, 0),
        vendas.total_geral,
      );
    });
  });

  test('itens confirmados no repositório em memória respeitam fuso America/Recife', async () => {
    const ctx = montarAppMemoria();
    ctx.vendaRepository.vendas.push({
      id: 1,
      status: 'confirmada',
      formaPagamento: 'dinheiro',
      dataOperacao: () => '2026-08-14',
      itens: [{ produtoId: 1, quantidade: 1, precoUnitario: 7, subtotal: 7 }],
    });
    ctx.vendaRepository.vendas.push({
      id: 2,
      status: 'confirmada',
      formaPagamento: 'pix',
      dataOperacao: () => '2026-08-15',
      itens: [{ produtoId: 1, quantidade: 1, precoUnitario: 13, subtotal: 13 }],
    });
    ctx.vendaRepository.vendas.push({
      id: 3,
      status: 'cancelada',
      formaPagamento: 'cartao',
      dataOperacao: () => '2026-08-15',
      itens: [{ produtoId: 1, quantidade: 1, precoUnitario: 99, subtotal: 99 }],
    });
    ctx.produtoRepository.itens.push({ id: 1, nome: 'Pão', ativo: 1 });

    const dia14 = await ctx.vendaRepository.listarItensConfirmadosNoPeriodo(
      '2026-08-14',
      '2026-08-14',
    );
    assert.equal(dia14.length, 1);
    assert.equal(dia14[0].subtotal, 7);

    const dia15 = await ctx.vendaRepository.listarItensConfirmadosNoPeriodo(
      '2026-08-15',
      '2026-08-15',
    );
    assert.equal(dia15.length, 1);
    assert.equal(dia15[0].subtotal, 13);

    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}` };
      const vendas = await json(
        await fetch(
          `http://127.0.0.1:${porta}/api/relatorios/vendas?data_inicio=2026-08-15&data_fim=2026-08-15`,
          { headers },
        ),
      );
      const abc = await json(
        await fetch(
          `http://127.0.0.1:${porta}/api/relatorios/curva-abc?data_inicio=2026-08-15&data_fim=2026-08-15`,
          { headers },
        ),
      );
      assert.equal(vendas.total_geral, 13);
      assert.equal(
        abc.por_receita.reduce((s, i) => s + i.receita, 0),
        vendas.total_geral,
      );
    });
  });
});
