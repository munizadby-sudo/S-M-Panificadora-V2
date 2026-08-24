import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import {
  buscarCurvaAbc,
  buscarRelatorioFechamentoCaixa,
  buscarRelatorioResultado,
  buscarRelatorioVendas,
  buscarVendasPorHora,
} from '../../src/modules/relatorios/api.js';
import {
  htmlCurvaAbc,
  htmlRelatorioFechamento,
  htmlRelatorioResultado,
  htmlRelatorioVendas,
} from '../../src/modules/relatorios/blocos.js';
import { exportarCsv } from '../../src/modules/relatorios/csv.js';
import { htmlCardsKpiVendas, htmlDashboardRelatorios } from '../../src/modules/relatorios/dashboard.js';
import { htmlFiltroPeriodo } from '../../src/modules/relatorios/filtro.js';
import { dataHoje } from '../../src/modules/relatorios/html.js';
import moduloRelatorios from '../../src/modules/relatorios/index.js';
import { criarContainer } from '../helpers/ambiente.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['rel'],
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

describe('Passo 1 — filtro de período', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloRelatorios.id, 'relatorios');
    assert.equal(moduloRelatorios.label, 'Relatórios');
    assert.equal(moduloRelatorios.permissao, 'rel');
    assert.equal(typeof moduloRelatorios.montar, 'function');
    assert.equal(typeof moduloRelatorios.desmontar, 'function');
  });

  test('filtro tem data início/fim e atalho Hoje', () => {
    const html = htmlFiltroPeriodo({ dataInicio: '2026-08-22', dataFim: '2026-08-22' });
    assert.match(html, /relatorios-data-inicio/);
    assert.match(html, /relatorios-data-fim/);
    assert.match(html, /btn-relatorios-hoje/);
    assert.match(html, /2026-08-22/);
  });

  test('dataHoje retorna YYYY-MM-DD', () => {
    assert.match(dataHoje(new Date('2026-08-22T15:00:00-03:00')), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('Passo 2 — relatório de vendas', () => {
  test('API chama GET /relatorios/vendas', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ total_geral: 10, por_forma_pagamento: [], por_produto: [] });
    };
    const resposta = await buscarRelatorioVendas({
      data_inicio: '2026-08-01',
      data_fim: '2026-08-22',
    });
    assert.equal(resposta.total_geral, 10);
    assert.match(urls[0], /\/relatorios\/vendas/);
    assert.match(urls[0], /data_inicio=2026-08-01/);
  });

  test('HTML exibe total, formas e produtos', () => {
    const html = htmlRelatorioVendas({
      total_geral: 100,
      por_forma_pagamento: [{ forma_pagamento: 'pix', total: 60 }],
      por_produto: [{ produto: 'Pão', quantidade: 10, receita: 100 }],
    });
    assert.match(html, /Total geral/);
    assert.match(html, /pix/);
    assert.match(html, /Pão/);
  });
});

describe('Passo 3 — fechamento de caixa', () => {
  test('API chama GET /relatorios/fechamento-caixa', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ turnos: [], resumo_periodo: {} });
    };
    await buscarRelatorioFechamentoCaixa({ data_inicio: '2026-08-01', data_fim: '2026-08-22' });
    assert.match(urls[0], /\/relatorios\/fechamento-caixa/);
  });

  test('diferença negativa e positiva têm classes distintas', () => {
    const html = htmlRelatorioFechamento({
      resumo_periodo: { esperado_total: 100, contado_total: 90, diferenca_total: -10 },
      turnos: [
        {
          data: '2026-08-22',
          periodo: 'manha',
          esperado: { dinheiro: 100, pix: 0, cartao: 0 },
          contado: { dinheiro: 90, pix: 0, cartao: 0 },
          diferenca: { total: -10 },
          status_resumo: 'falta',
        },
        {
          data: '2026-08-22',
          periodo: 'tarde',
          esperado: { dinheiro: 50, pix: 0, cartao: 0 },
          contado: { dinheiro: 60, pix: 0, cartao: 0 },
          diferenca: { total: 10 },
          status_resumo: 'sobra',
        },
      ],
    });
    assert.match(html, /relatorios-falta/);
    assert.match(html, /relatorios-sobra/);
    assert.match(html, /falta/);
    assert.match(html, /sobra/);
  });
});

describe('Passo 4 — curva ABC', () => {
  test('API chama GET /relatorios/curva-abc', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ por_receita: [], por_quantidade: [] });
    };
    await buscarCurvaAbc({ data_inicio: '2026-08-01', data_fim: '2026-08-22' });
    assert.match(urls[0], /\/relatorios\/curva-abc/);
  });

  test('classe A/B/C só na tabela por receita', () => {
    const html = htmlCurvaAbc({
      por_receita: [
        {
          produto: 'Pão',
          quantidade: 10,
          receita: 100,
          percentual_acumulado: 80,
          classe: 'A',
        },
      ],
      por_quantidade: [{ produto: 'Pão', quantidade: 10, receita: 100 }],
    });
    assert.match(html, /relatorios-classe-A/);
    assert.match(html, /Por quantidade/);
    const parteQtd = html.split('Por quantidade')[1];
    assert.doesNotMatch(parteQtd, /relatorios-classe/);
  });
});

describe('Passo 5 — resultado', () => {
  test('API chama GET /relatorios/resultado', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        total_entradas: 100,
        total_saidas: 40,
        resultado: 60,
        por_categoria: [{ categoria: 'vendas', entradas: 100, saidas: 0 }],
      });
    };
    const resposta = await buscarRelatorioResultado({
      data_inicio: '2026-08-01',
      data_fim: '2026-08-22',
    });
    assert.equal(resposta.resultado, 60);
    assert.match(urls[0], /\/relatorios\/resultado/);
  });

  test('resultado negativo tem destaque', () => {
    const html = htmlRelatorioResultado({
      total_entradas: 10,
      total_saidas: 40,
      resultado: -30,
      por_categoria: [{ categoria: 'sangria', entradas: 0, saidas: 40 }],
    });
    assert.match(html, /relatorios-falta/);
    assert.match(html, /sangria/);
  });
});

describe('Passo 6 — exportação CSV', () => {
  test('exportarCsv monta arquivo a partir das linhas exibidas', () => {
    const cliques = [];
    globalThis.URL.createObjectURL = () => 'blob:teste';
    globalThis.URL.revokeObjectURL = () => {};
    globalThis.Blob = class Blob {
      constructor(parts) {
        this.parts = parts;
      }
    };
    document.createElement = (tag) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click() {
            cliques.push({ download: this.download, href: this.href });
          },
          remove() {},
        };
      }
      return { appendChild() {} };
    };

    const resultado = exportarCsv('vendas.csv', ['produto', 'receita'], [['Pão', 10]]);
    assert.equal(cliques.length, 1);
    assert.equal(cliques[0].download, 'vendas.csv');
    assert.match(resultado.conteudo, /produto;receita/);
    assert.match(resultado.conteudo, /Pão;10/);
  });
});

describe('Passo 7 — dashboard (SPEC-FE-016)', () => {
  test('API chama GET /relatorios/vendas-por-hora', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ por_hora: [{ hora: 8, quantidade: 3 }] });
    };
    const resposta = await buscarVendasPorHora({
      data_inicio: '2026-08-01',
      data_fim: '2026-08-22',
    });
    assert.equal(resposta.por_hora[0].hora, 8);
    assert.match(urls[0], /\/relatorios\/vendas-por-hora/);
    assert.match(urls[0], /data_inicio=2026-08-01/);
    assert.match(urls[0], /data_fim=2026-08-22/);
  });

  test('KPIs batem com total_geral, quantidade_itens e ticket_medio', () => {
    const html = htmlCardsKpiVendas({
      totalGeral: 250.5,
      quantidadeItens: 42,
      ticketMedio: 12.525,
      numeroVendas: 1,
    });
    assert.match(html, /Receita total/);
    assert.match(html, /Itens vendidos/);
    assert.match(html, /Ticket médio/);
    assert.match(html, /250,50/);
    assert.match(html, /42/);
    assert.match(html, /12,53|12,525/);
    assert.match(html, /1 venda/);
    assert.match(html, /no período/);
    assert.match(html, /por venda/);
  });

  test('dashboard usa campos da resposta de vendas mockada', () => {
    const html = htmlDashboardRelatorios({
      vendas: {
        carregando: false,
        erro: '',
        dados: {
          total_geral: 100,
          quantidade_itens: 20,
          ticket_medio: 10,
          numero_vendas: 4,
          por_forma_pagamento: [{ forma_pagamento: 'pix', total: 100 }],
          por_produto: [{ produto: 'Pão', receita: 80 }],
        },
      },
      vendasPorHora: {
        carregando: false,
        erro: '',
        dados: { por_hora: [{ hora: 9, quantidade: 5 }] },
      },
    });
    assert.match(html, /Dashboard de Vendas/);
    assert.match(html, /Receita total/);
    assert.match(html, /100,00/);
    assert.match(html, /20/);
    assert.match(html, /4 vendas/);
    assert.match(html, /9h/);
    assert.match(html, /pix/i);
    assert.match(html, /Pão/);
  });

  test('sem dado mostra estado vazio em vez de gráfico zerado', () => {
    const html = htmlDashboardRelatorios({
      vendas: { carregando: false, erro: '', dados: null },
      vendasPorHora: { carregando: false, erro: '', dados: { por_hora: [] } },
    });
    assert.match(html, /estado-vazio/);
    assert.doesNotMatch(html, /grafico-v-barra/);
    assert.doesNotMatch(html, /barra-h-preenchimento/);
  });

  test('carregarTodos inclui vendasPorHora no mesmo Promise.all', () => {
    const arquivo = join(dirname(fileURLToPath(import.meta.url)), '../../src/modules/relatorios/index.js');
    const fonte = readFileSync(arquivo, 'utf8');
    const trecho = fonte.match(/await Promise\.all\(\[[\s\S]*?\]\);/);
    assert.ok(trecho, 'Promise.all deve existir em carregarTodos');
    assert.match(trecho[0], /buscarVendasPorHora/);
    assert.match(trecho[0], /buscarRelatorioVendas/);
    assert.match(trecho[0], /buscarRelatorioFechamentoCaixa/);
    assert.match(trecho[0], /buscarCurvaAbc/);
    assert.match(trecho[0], /buscarRelatorioResultado/);
  });

  test('montar dispara vendas-por-hora em paralelo com os outros blocos', async () => {
    const iniciados = [];
    let liberar;
    const trava = new Promise((resolve) => {
      liberar = resolve;
    });

    globalThis.fetch = async (url) => {
      iniciados.push(String(url));
      await trava;
      if (String(url).includes('vendas-por-hora')) {
        return jsonOk({ por_hora: [] });
      }
      if (String(url).includes('fechamento-caixa')) {
        return jsonOk({ turnos: [], resumo_periodo: {} });
      }
      if (String(url).includes('curva-abc')) {
        return jsonOk({ por_receita: [], por_quantidade: [] });
      }
      if (String(url).includes('resultado')) {
        return jsonOk({ total_entradas: 0, total_saidas: 0, resultado: 0, por_categoria: [] });
      }
      return jsonOk({
        total_geral: 0,
        quantidade_itens: 0,
        ticket_medio: 0,
        por_forma_pagamento: [],
        por_produto: [],
      });
    };

    const container = criarContainer();
    container.querySelector = () => null;
    container.querySelectorAll = () => [];

    const promessa = moduloRelatorios.montar(container);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const urlsRelatorios = iniciados.filter((url) => url.includes('/relatorios/'));
    assert.ok(urlsRelatorios.some((url) => url.includes('vendas-por-hora')));
    assert.ok(urlsRelatorios.length >= 5, `esperava 5 chamadas em paralelo, veio ${urlsRelatorios.length}`);

    liberar();
    await promessa;
    moduloRelatorios.desmontar();
  });
});
