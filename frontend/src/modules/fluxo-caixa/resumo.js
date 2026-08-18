import { escapar, formatarMoeda } from './html.js';

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

  return `<section class="fluxo-kpis" aria-label="Resumo por forma de pagamento">
    <h2>Resumo do turno</h2>
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
  </section>`;
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
