import { htmlBarraHorizontal, htmlGraficoBarrasVerticais } from './barras.js';
import { escapar, formatarMoeda, formatarNumero } from './html.js';

export function htmlCardsKpiVendas({
  totalGeral,
  quantidadeItens,
  ticketMedio,
  numeroVendas,
} = {}) {
  const metaReceita =
    numeroVendas == null
      ? 'no período'
      : `${formatarNumero(numeroVendas)} ${Number(numeroVendas) === 1 ? 'venda' : 'vendas'}`;
  return `<div class="dashboard-kpis" aria-label="Indicadores de vendas">
    ${htmlKpiCard({ icone: '💰', rotulo: 'Receita total', valor: formatarMoeda(totalGeral), meta: metaReceita })}
    ${htmlKpiCard({ icone: '🛒', rotulo: 'Itens vendidos', valor: formatarNumero(quantidadeItens), meta: 'no período' })}
    ${htmlKpiCard({ icone: '🎫', rotulo: 'Ticket médio', valor: formatarMoeda(ticketMedio), meta: 'por venda' })}
  </div>`;
}

export function htmlDashboardRelatorios({ vendas, vendasPorHora } = {}) {
  const dadosVendas = vendas?.dados;
  const erroVendas = vendas?.erro;
  const carregandoVendas = vendas?.carregando;
  const dadosHora = vendasPorHora?.dados;
  const erroHora = vendasPorHora?.erro;
  const carregandoHora = vendasPorHora?.carregando;

  return `<section class="relatorios-dashboard" aria-label="Dashboard de vendas">
    <header class="dashboard-cabecalho">
      <div>
        <p class="dashboard-eyebrow">Dashboard</p>
        <h2>Dashboard de Vendas</h2>
        <p class="dashboard-subtitulo">Indicadores e gráficos com base no filtro de datas acima.</p>
      </div>
    </header>
    ${htmlSecaoKpis({ dadosVendas, erroVendas, carregandoVendas })}
    <div class="dashboard-grade">
      ${htmlSecaoVendasPorHora({ dadosHora, erroHora, carregandoHora })}
      ${htmlSecaoFormas({ dadosVendas, carregandoVendas, erroVendas })}
      ${htmlSecaoTopProdutos({ dadosVendas, carregandoVendas, erroVendas })}
    </div>
  </section>`;
}

function htmlKpiCard({ icone, rotulo, valor, meta }) {
  const metaHtml = meta
    ? `<p class="dashboard-kpi-meta">${escapar(meta)}</p>`
    : '';
  return `<article class="dashboard-kpi-card">
    <div class="dashboard-kpi-topo">
      <span class="dashboard-kpi-icone" aria-hidden="true">${icone}</span>
      <p class="dashboard-kpi-rotulo">${escapar(rotulo)}</p>
    </div>
    <p class="dashboard-kpi-valor">${valor}</p>
    ${metaHtml}
  </article>`;
}

function htmlSecaoKpis({ dadosVendas, erroVendas, carregandoVendas }) {
  if (carregandoVendas) {
    return '<p class="relatorios-carregando">Carregando…</p>';
  }
  if (erroVendas) {
    return `<p class="relatorios-erro" role="alert">${escapar(erroVendas)}</p>`;
  }
  if (!dadosVendas) {
    return estadoVazio(
      'Sem dados no período.',
      'Ajuste o intervalo de datas no filtro acima para ver os indicadores.',
    );
  }
  return htmlCardsKpiVendas({
    totalGeral: dadosVendas.total_geral,
    quantidadeItens: dadosVendas.quantidade_itens,
    ticketMedio: dadosVendas.ticket_medio,
    numeroVendas: dadosVendas.numero_vendas,
  });
}

function htmlSecaoVendasPorHora({ dadosHora, erroHora, carregandoHora }) {
  if (carregandoHora) {
    return blocoDashboard('Vendas por hora', 'Distribuição ao longo do dia', '<p class="relatorios-carregando">Carregando…</p>');
  }
  if (erroHora) {
    return blocoDashboard(
      'Vendas por hora',
      'Distribuição ao longo do dia',
      `<p class="relatorios-erro" role="alert">${escapar(erroHora)}</p>`,
    );
  }
  const pontos = dadosHora?.por_hora || [];
  if (!pontos.length) {
    return blocoDashboard(
      'Vendas por hora',
      'Distribuição ao longo do dia',
      estadoVazio(
        'Sem vendas no período.',
        'O gráfico por hora aparece quando houver vendas confirmadas no intervalo.',
      ),
    );
  }
  return blocoDashboard(
    'Vendas por hora',
    'Distribuição ao longo do dia',
    htmlGraficoBarrasVerticais({
      pontos,
      chaveRotulo: 'hora',
      chaveValor: 'quantidade',
      formatadorRotulo: (hora) => `${hora}h`,
    }),
  );
}

function htmlSecaoFormas({ dadosVendas, carregandoVendas, erroVendas }) {
  if (carregandoVendas) {
    return blocoDashboard('Por forma de pagamento', 'Participação no faturamento', '<p class="relatorios-carregando">Carregando…</p>');
  }
  if (erroVendas) {
    return blocoDashboard(
      'Por forma de pagamento',
      'Participação no faturamento',
      `<p class="relatorios-erro" role="alert">${escapar(erroVendas)}</p>`,
    );
  }
  const formas = dadosVendas?.por_forma_pagamento || [];
  if (!dadosVendas || !formas.length) {
    return blocoDashboard(
      'Por forma de pagamento',
      'Participação no faturamento',
      estadoVazio(
        'Sem vendas no período.',
        'As barras por forma de pagamento aparecem quando houver vendas no intervalo.',
      ),
    );
  }
  const valorMaximo = Math.max(...formas.map((item) => Number(item.total) || 0));
  const barras = formas
    .map((item) =>
      htmlBarraHorizontal({
        rotulo: item.forma_pagamento,
        valor: item.total,
        valorMaximo,
      }),
    )
    .join('');
  return blocoDashboard('Por forma de pagamento', 'Participação no faturamento', barras);
}

function htmlSecaoTopProdutos({ dadosVendas, carregandoVendas, erroVendas }) {
  if (carregandoVendas) {
    return blocoDashboard('Top 5 produtos', 'Maiores receitas do período', '<p class="relatorios-carregando">Carregando…</p>');
  }
  if (erroVendas) {
    return blocoDashboard(
      'Top 5 produtos',
      'Maiores receitas do período',
      `<p class="relatorios-erro" role="alert">${escapar(erroVendas)}</p>`,
    );
  }
  const produtos = (dadosVendas?.por_produto || []).slice(0, 5);
  if (!dadosVendas || !produtos.length) {
    return blocoDashboard(
      'Top 5 produtos',
      'Maiores receitas do período',
      estadoVazio(
        'Sem produtos no período.',
        'O ranking dos 5 produtos aparece quando houver vendas no intervalo.',
      ),
    );
  }
  const valorMaximo = Math.max(...produtos.map((item) => Number(item.receita) || 0));
  const barras = produtos
    .map((item) =>
      htmlBarraHorizontal({
        rotulo: item.produto,
        valor: item.receita,
        valorMaximo,
      }),
    )
    .join('');
  return blocoDashboard('Top 5 produtos', 'Maiores receitas do período', barras);
}

function blocoDashboard(titulo, subtitulo, corpo, classeExtra = '') {
  const classe = ['dashboard-secao', classeExtra].filter(Boolean).join(' ');
  return `<article class="${classe}">
    <header class="dashboard-secao-cabecalho">
      <h3>${escapar(titulo)}</h3>
      <p class="dashboard-secao-subtitulo">${escapar(subtitulo)}</p>
    </header>
    <div class="dashboard-secao-corpo">${corpo}</div>
  </article>`;
}

function estadoVazio(titulo, dica) {
  return `<p class="estado-vazio">${escapar(titulo)}<span class="estado-vazio-dica">${escapar(dica)}</span></p>`;
}
