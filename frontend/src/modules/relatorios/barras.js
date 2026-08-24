import { escapar, formatarMoeda } from './html.js';

export function htmlBarraHorizontal({
  rotulo,
  valor,
  valorMaximo,
  corVar = '--destaque',
  formatador = formatarMoeda,
} = {}) {
  const numero = Number(valor) || 0;
  const maximo = Number(valorMaximo) || 0;
  const percentual = maximo > 0 ? Math.round((numero / maximo) * 100) : 0;
  return `<div class="barra-h">
    <span class="barra-h-rotulo" title="${escapar(rotulo)}">${escapar(rotulo)}</span>
    <div class="barra-h-trilho"><div class="barra-h-preenchimento" style="width: ${percentual}%; --barra-cor: var(${escapar(corVar)})"></div></div>
    <span class="barra-h-valor">${escapar(formatador(numero))}</span>
  </div>`;
}

export function htmlGraficoBarrasVerticais({
  pontos = [],
  chaveRotulo,
  chaveValor,
  corVar = '--destaque',
  formatadorRotulo,
} = {}) {
  if (!Array.isArray(pontos) || pontos.length === 0) {
    return '';
  }

  const valores = pontos.map((ponto) => Number(ponto?.[chaveValor]) || 0);
  const valorMaximo = Math.max(...valores);
  const barras = pontos
    .map((ponto) => {
      const valor = Number(ponto?.[chaveValor]) || 0;
      const percentual = valorMaximo > 0 ? Math.round((valor / valorMaximo) * 100) : 0;
      const rotuloBruto = ponto?.[chaveRotulo];
      const rotulo =
        typeof formatadorRotulo === 'function'
          ? formatadorRotulo(rotuloBruto)
          : `${rotuloBruto ?? ''}h`;
      return `<div class="grafico-v-item">
        <div class="grafico-v-trilho"><div class="grafico-v-barra" style="height: ${percentual}%; --barra-cor: var(${escapar(corVar)})" title="${escapar(String(valor))}"></div></div>
        <span class="grafico-v-rotulo">${escapar(rotulo)}</span>
      </div>`;
    })
    .join('');

  return `<div class="grafico-v">${barras}</div>`;
}
