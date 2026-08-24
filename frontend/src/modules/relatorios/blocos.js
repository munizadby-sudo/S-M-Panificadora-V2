import { escapar, formatarMoeda, formatarNumero } from './html.js';

export function htmlBlocoRelatorio({ id, titulo, erro = '', carregando = false, corpo = '' }) {
  const estado = carregando
    ? '<p class="relatorios-carregando">Carregando…</p>'
    : erro
      ? `<p class="relatorios-erro" role="alert">${escapar(erro)}</p>`
      : corpo;
  return `<section class="relatorios-bloco" id="bloco-${escapar(id)}" data-relatorio="${escapar(id)}">
    <header class="relatorios-bloco-cabecalho">
      <h2>${escapar(titulo)}</h2>
      <button type="button" class="relatorios-exportar" data-exportar="${escapar(id)}">Exportar CSV</button>
    </header>
    <div class="relatorios-bloco-corpo">${estado}</div>
  </section>`;
}

export function htmlRelatorioVendas(dados) {
  if (!dados) {
    return '<p class="estado-vazio">Sem dados no período.<span class="estado-vazio-dica">Ajuste o intervalo de datas no filtro acima para gerar o relatório de vendas.</span></p>';
  }
  const formas = (dados.por_forma_pagamento || [])
    .map(
      (item) =>
        `<tr><td>${escapar(item.forma_pagamento)}</td><td>${formatarMoeda(item.total)}</td></tr>`,
    )
    .join('');
  const produtos = (dados.por_produto || [])
    .map(
      (item) =>
        `<tr><td>${escapar(item.produto)}</td><td>${formatarNumero(item.quantidade)}</td><td>${formatarMoeda(item.receita)}</td></tr>`,
    )
    .join('');
  return `<p class="relatorios-kpi">Total geral: <strong>${formatarMoeda(dados.total_geral)}</strong></p>
    <h3>Por forma de pagamento</h3>
    <table class="relatorios-tabela"><thead><tr><th>Forma</th><th>Total</th></tr></thead><tbody>${formas || '<tr><td colspan="2">—</td></tr>'}</tbody></table>
    <h3>Por produto</h3>
    <table class="relatorios-tabela"><thead><tr><th>Produto</th><th>Qtd</th><th>Receita</th></tr></thead><tbody>${produtos || '<tr><td colspan="3">—</td></tr>'}</tbody></table>`;
}

export function htmlRelatorioFechamento(dados) {
  if (!dados) {
    return '<p class="estado-vazio">Sem turnos fechados no período.<span class="estado-vazio-dica">Aparecem aqui os fechamentos de caixa já concluídos no intervalo selecionado.</span></p>';
  }
  const resumo = dados.resumo_periodo || {};
  const linhas = (dados.turnos || [])
    .map((t) => {
      const dif = Number(t.diferenca?.total || 0);
      const classe = dif < 0 ? 'relatorios-falta' : dif > 0 ? 'relatorios-sobra' : '';
      return `<tr class="${classe}">
        <td>${escapar(t.data)}</td>
        <td>${escapar(t.periodo)}</td>
        <td>${formatarMoeda(totalFormas(t.esperado))}</td>
        <td>${formatarMoeda(totalFormas(t.contado))}</td>
        <td>${formatarMoeda(dif)}</td>
        <td>${escapar(t.status_resumo)}</td>
      </tr>`;
    })
    .join('');
  return `<p class="relatorios-kpi">Esperado ${formatarMoeda(resumo.esperado_total)} · Contado ${formatarMoeda(resumo.contado_total)} · Diferença ${formatarMoeda(resumo.diferenca_total)}</p>
    <table class="relatorios-tabela">
      <thead><tr><th>Data</th><th>Período</th><th>Esperado</th><th>Contado</th><th>Diferença</th><th>Status</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="6">Nenhum turno fechado.</td></tr>'}</tbody>
    </table>`;
}

export function htmlCurvaAbc(dados) {
  if (!dados) {
    return '<p class="estado-vazio">Sem dados no período.<span class="estado-vazio-dica">A curva ABC e o ranking por quantidade aparecem aqui quando houver vendas no intervalo.</span></p>';
  }
  const porReceita = (dados.por_receita || [])
    .map(
      (item) =>
        `<tr><td>${escapar(item.produto)}</td><td>${formatarNumero(item.quantidade)}</td><td>${formatarMoeda(item.receita)}</td><td>${formatarNumero(item.percentual_acumulado)}%</td><td><span class="relatorios-classe relatorios-classe-${escapar(item.classe)}">${escapar(item.classe)}</span></td></tr>`,
    )
    .join('');
  const porQtd = (dados.por_quantidade || [])
    .map(
      (item) =>
        `<tr><td>${escapar(item.produto)}</td><td>${formatarNumero(item.quantidade)}</td><td>${formatarMoeda(item.receita)}</td></tr>`,
    )
    .join('');
  return `<h3>Por receita (curva ABC)</h3>
    <table class="relatorios-tabela"><thead><tr><th>Produto</th><th>Qtd</th><th>Receita</th><th>% acum.</th><th>Classe</th></tr></thead><tbody>${porReceita || '<tr><td colspan="5">—</td></tr>'}</tbody></table>
    <h3>Por quantidade (ranking)</h3>
    <table class="relatorios-tabela"><thead><tr><th>Produto</th><th>Qtd</th><th>Receita</th></tr></thead><tbody>${porQtd || '<tr><td colspan="3">—</td></tr>'}</tbody></table>`;
}

export function htmlRelatorioResultado(dados) {
  if (!dados) {
    return '<p class="estado-vazio">Sem lançamentos no período.<span class="estado-vazio-dica">Entradas e saídas do fluxo de caixa no intervalo aparecem aqui após o filtro.</span></p>';
  }
  const resultado = Number(dados.resultado || 0);
  const classeResultado = resultado < 0 ? 'relatorios-falta' : 'relatorios-sobra';
  const cats = (dados.por_categoria || [])
    .map(
      (item) =>
        `<tr><td>${escapar(item.categoria)}</td><td>${formatarMoeda(item.entradas)}</td><td>${formatarMoeda(item.saidas)}</td></tr>`,
    )
    .join('');
  return `<p class="relatorios-kpi">Entradas ${formatarMoeda(dados.total_entradas)} · Saídas ${formatarMoeda(dados.total_saidas)} · <span class="${classeResultado}">Resultado ${formatarMoeda(resultado)}</span></p>
    <table class="relatorios-tabela"><thead><tr><th>Categoria</th><th>Entradas</th><th>Saídas</th></tr></thead><tbody>${cats || '<tr><td colspan="3">—</td></tr>'}</tbody></table>`;
}

function totalFormas(formas = {}) {
  return Number(formas.dinheiro || 0) + Number(formas.pix || 0) + Number(formas.cartao || 0);
}
