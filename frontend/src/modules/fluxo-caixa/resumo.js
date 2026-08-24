import { escapar, formatarMoeda } from './html.js';

export function htmlCardsKpiFluxo(resumo) {
  if (!resumo) {
    return '';
  }

  const entradas =
    Number(resumo.entradas?.dinheiro || 0) +
    Number(resumo.entradas?.pix || 0) +
    Number(resumo.entradas?.cartao || 0);
  const saidas =
    Number(resumo.saidas?.dinheiro || 0) +
    Number(resumo.saidas?.pix || 0) +
    Number(resumo.saidas?.cartao || 0);
  const liquido = Math.round((entradas - saidas) * 100) / 100;

  return `<section class="fluxo-dashboard" aria-label="Dashboard do turno">
    <div class="dashboard-kpis fluxo-dashboard-kpis" aria-label="Indicadores do turno">
      ${htmlKpiCard({
        icone: '↑',
        rotulo: 'Entradas',
        valor: formatarMoeda(entradas),
        variante: 'entrada',
      })}
      ${htmlKpiCard({
        icone: '↓',
        rotulo: 'Saídas',
        valor: formatarMoeda(saidas),
        variante: 'saida',
      })}
      ${htmlKpiCard({
        icone: 'Σ',
        rotulo: 'Saldo do turno',
        valor: formatarMoeda(liquido),
        variante: liquido < 0 ? 'saida' : 'entrada',
      })}
    </div>
  </section>`;
}

export function htmlResumoKPIs(resumo) {
  if (!resumo) {
    return '';
  }

  const formas = ['dinheiro', 'pix', 'cartao'];
  const rotulos = { dinheiro: 'Dinheiro', pix: 'Pix', cartao: 'Cartão' };
  const linhas = formas
    .map((forma) => {
      const entradas = resumo.entradas?.[forma] ?? 0;
      const saidas = resumo.saidas?.[forma] ?? 0;
      const liquido = Math.round((Number(entradas) - Number(saidas)) * 100) / 100;
      return `<tr>
        <th scope="row">${escapar(rotulos[forma])}</th>
        <td class="fluxo-kpi-entrada">${formatarMoeda(entradas)}</td>
        <td class="fluxo-kpi-saida">${formatarMoeda(saidas)}</td>
        <td class="fluxo-kpi-liquido">${formatarMoeda(liquido)}</td>
      </tr>`;
    })
    .join('');

  return `<section class="fluxo-kpis dashboard-secao" aria-label="Resumo por forma de pagamento">
    <header class="dashboard-secao-cabecalho">
      <h2>Por forma de pagamento</h2>
      <p class="dashboard-secao-subtitulo">Detalhe do turno aberto — mesmos totais dos cards acima.</p>
    </header>
    <div class="dashboard-secao-corpo">
      <table class="fluxo-kpis-tabela">
        <thead>
          <tr>
            <th>Forma</th>
            <th>Entradas</th>
            <th>Saídas</th>
            <th>Líquido</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  </section>`;
}

function htmlKpiCard({ icone, rotulo, valor, variante = '' }) {
  const classeValor = variante ? ` dashboard-kpi-valor--${variante}` : '';
  return `<article class="dashboard-kpi-card">
    <div class="dashboard-kpi-topo">
      <span class="dashboard-kpi-icone" aria-hidden="true">${icone}</span>
      <p class="dashboard-kpi-rotulo">${escapar(rotulo)}</p>
    </div>
    <p class="dashboard-kpi-valor${classeValor}">${valor}</p>
  </article>`;
}

export function extrairLiquidoPorForma(resumo) {
  const formas = ['dinheiro', 'pix', 'cartao'];
  const liquido = {};
  for (const forma of formas) {
    const entradas = Number(resumo?.entradas?.[forma] || 0);
    const saidas = Number(resumo?.saidas?.[forma] || 0);
    liquido[forma] = Math.round((entradas - saidas) * 100) / 100;
  }
  return liquido;
}

export function bateComEsperadoFechamento(resumo, esperado, { fundoEspecie = 0, fundoMoedas = 0 } = {}) {
  if (!resumo || !esperado) {
    return false;
  }
  const liquido = extrairLiquidoPorForma(resumo);
  const fundo = Math.round((Number(fundoEspecie) + Number(fundoMoedas)) * 100) / 100;
  const esperadoDinheiro = Math.round((Number(esperado.dinheiro) || 0) * 100) / 100;
  const esperadoPix = Math.round((Number(esperado.pix) || 0) * 100) / 100;
  const esperadoCartao = Math.round((Number(esperado.cartao) || 0) * 100) / 100;

  return (
    Math.round((liquido.dinheiro + fundo) * 100) / 100 === esperadoDinheiro &&
    liquido.pix === esperadoPix &&
    liquido.cartao === esperadoCartao
  );
}
