import {
  buscarCurvaAbc,
  buscarRelatorioFechamentoCaixa,
  buscarRelatorioResultado,
  buscarRelatorioVendas,
  buscarVendasPorHora,
  mensagemErroRelatorio,
} from './api.js';
import {
  htmlBlocoRelatorio,
  htmlCurvaAbc,
  htmlRelatorioFechamento,
  htmlRelatorioResultado,
  htmlRelatorioVendas,
} from './blocos.js';
import { exportarCsv } from './csv.js';
import { htmlDashboardRelatorios } from './dashboard.js';
import { htmlFiltroPeriodo } from './filtro.js';
import { dataHoje } from './html.js';

export { exportarCsv } from './csv.js';
export { htmlFiltroPeriodo } from './filtro.js';
export {
  htmlRelatorioVendas,
  htmlRelatorioFechamento,
  htmlCurvaAbc,
  htmlRelatorioResultado,
} from './blocos.js';
export { htmlBarraHorizontal, htmlGraficoBarrasVerticais } from './barras.js';
export { htmlCardsKpiVendas, htmlDashboardRelatorios } from './dashboard.js';

let containerAtual;
let estado;

export default {
  id: 'relatorios',
  label: 'Relatórios',
  icone: 'ti-chart-bar',
  permissao: 'rel',
  async montar(container) {
    if (!container) {
      return;
    }
    containerAtual = container;
    const hoje = dataHoje();
    estado = {
      dataInicio: hoje,
      dataFim: hoje,
      erroFiltro: '',
      vendas: blocoVazio(),
      vendasPorHora: blocoVazio(),
      fechamento: blocoVazio(),
      curvaAbc: blocoVazio(),
      resultado: blocoVazio(),
    };
    renderizar();
    await carregarTodos();
  },
  desmontar() {
    containerAtual = undefined;
    estado = undefined;
  },
};

function blocoVazio() {
  return { dados: null, erro: '', carregando: false };
}

function renderizar() {
  const container = containerAtual;
  if (!container || !estado) {
    return;
  }

  container.innerHTML = `
    <section class="relatorios">
      <header class="pagina-cabecalho">
        <div>
          <p class="dashboard-eyebrow">Análises</p>
          <h1>Relatórios</h1>
          <p class="dashboard-subtitulo">Acompanhe vendas, fechamento, curva ABC e resultado do período.</p>
        </div>
      </header>
      ${htmlFiltroPeriodo({
        dataInicio: estado.dataInicio,
        dataFim: estado.dataFim,
        erro: estado.erroFiltro,
      })}
      ${htmlDashboardRelatorios({
        vendas: estado.vendas,
        vendasPorHora: estado.vendasPorHora,
      })}
      ${htmlBlocoRelatorio({
        id: 'vendas',
        titulo: 'Vendas',
        erro: estado.vendas.erro,
        carregando: estado.vendas.carregando,
        corpo: htmlRelatorioVendas(estado.vendas.dados),
      })}
      ${htmlBlocoRelatorio({
        id: 'fechamento',
        titulo: 'Fechamento de caixa',
        erro: estado.fechamento.erro,
        carregando: estado.fechamento.carregando,
        corpo: htmlRelatorioFechamento(estado.fechamento.dados),
      })}
      ${htmlBlocoRelatorio({
        id: 'curva-abc',
        titulo: 'Curva ABC de produtos',
        erro: estado.curvaAbc.erro,
        carregando: estado.curvaAbc.carregando,
        corpo: htmlCurvaAbc(estado.curvaAbc.dados),
      })}
      ${htmlBlocoRelatorio({
        id: 'resultado',
        titulo: 'Resultado',
        erro: estado.resultado.erro,
        carregando: estado.resultado.carregando,
        corpo: htmlRelatorioResultado(estado.resultado.dados),
      })}
    </section>
  `;

  ligarEventos(container);
}

function ligarEventos(container) {
  container.querySelector('#form-filtro-relatorios')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const inicio = container.querySelector('#relatorios-data-inicio')?.value || '';
    const fim = container.querySelector('#relatorios-data-fim')?.value || '';
    if (!inicio || !fim || inicio > fim) {
      estado.erroFiltro = 'Informe um período válido (data início ≤ data fim).';
      renderizar();
      return;
    }
    estado.dataInicio = inicio;
    estado.dataFim = fim;
    estado.erroFiltro = '';
    await carregarTodos();
  });

  container.querySelector('#btn-relatorios-hoje')?.addEventListener('click', async () => {
    const hoje = dataHoje();
    estado.dataInicio = hoje;
    estado.dataFim = hoje;
    estado.erroFiltro = '';
    await carregarTodos();
  });

  for (const botao of container.querySelectorAll?.('[data-exportar]') || []) {
    botao.addEventListener('click', () => {
      exportarBloco(botao.getAttribute('data-exportar'));
    });
  }
}

async function carregarTodos() {
  const periodo = { data_inicio: estado.dataInicio, data_fim: estado.dataFim };
  estado.vendas.carregando = true;
  estado.vendasPorHora.carregando = true;
  estado.fechamento.carregando = true;
  estado.curvaAbc.carregando = true;
  estado.resultado.carregando = true;
  renderizar();

  await Promise.all([
    carregarBloco('vendas', () => buscarRelatorioVendas(periodo)),
    carregarBloco('vendasPorHora', () => buscarVendasPorHora(periodo)),
    carregarBloco('fechamento', () => buscarRelatorioFechamentoCaixa(periodo)),
    carregarBloco('curvaAbc', () => buscarCurvaAbc(periodo)),
    carregarBloco('resultado', () => buscarRelatorioResultado(periodo)),
  ]);
}

async function carregarBloco(chave, fn) {
  try {
    estado[chave].erro = '';
    estado[chave].dados = await fn();
  } catch (erro) {
    estado[chave].dados = null;
    estado[chave].erro = mensagemErroRelatorio(erro);
  } finally {
    estado[chave].carregando = false;
    renderizar();
  }
}

function exportarBloco(id) {
  const periodo = `${estado.dataInicio}_${estado.dataFim}`;
  if (id === 'vendas' && estado.vendas.dados) {
    const dados = estado.vendas.dados;
    exportarCsv(
      `relatorio-vendas-${periodo}.csv`,
      ['tipo', 'nome', 'quantidade', 'valor'],
      [
        ['total_geral', '', '', dados.total_geral],
        ...(dados.por_forma_pagamento || []).map((i) => [
          'forma',
          i.forma_pagamento,
          '',
          i.total,
        ]),
        ...(dados.por_produto || []).map((i) => ['produto', i.produto, i.quantidade, i.receita]),
      ],
    );
    return;
  }
  if (id === 'fechamento' && estado.fechamento.dados) {
    const dados = estado.fechamento.dados;
    exportarCsv(
      `relatorio-fechamento-${periodo}.csv`,
      ['data', 'periodo', 'esperado', 'contado', 'diferenca', 'status'],
      (dados.turnos || []).map((t) => [
        t.data,
        t.periodo,
        totalFormas(t.esperado),
        totalFormas(t.contado),
        t.diferenca?.total ?? 0,
        t.status_resumo,
      ]),
    );
    return;
  }
  if (id === 'curva-abc' && estado.curvaAbc.dados) {
    const dados = estado.curvaAbc.dados;
    exportarCsv(
      `relatorio-curva-abc-${periodo}.csv`,
      ['produto', 'quantidade', 'receita', 'percentual_acumulado', 'classe'],
      (dados.por_receita || []).map((i) => [
        i.produto,
        i.quantidade,
        i.receita,
        i.percentual_acumulado,
        i.classe,
      ]),
    );
    return;
  }
  if (id === 'resultado' && estado.resultado.dados) {
    const dados = estado.resultado.dados;
    exportarCsv(
      `relatorio-resultado-${periodo}.csv`,
      ['categoria', 'entradas', 'saidas'],
      [
        ['TOTAL', dados.total_entradas, dados.total_saidas],
        ...(dados.por_categoria || []).map((i) => [i.categoria, i.entradas, i.saidas]),
      ],
    );
  }
}

function totalFormas(formas = {}) {
  return Number(formas.dinheiro || 0) + Number(formas.pix || 0) + Number(formas.cartao || 0);
}
