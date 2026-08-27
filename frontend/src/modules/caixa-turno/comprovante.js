import { formatarMoeda } from '../../core/utils.js';
import { getUsuario } from '../../core/session.js';
import { peekTurno } from './estado.js';
import { LOGO_CUPOM_DATA_URI } from './logo-cupom-data-uri.js';

export function dataUriLogoCupom() {
  return LOGO_CUPOM_DATA_URI;
}

export function formatarPeriodoTurno(periodo) {
  if (periodo === 'manha') {
    return 'Manhã';
  }
  if (periodo === 'tarde') {
    return 'Tarde';
  }
  return String(periodo || '—');
}

export function formatarRotuloTurno({ periodo, turno_id } = {}) {
  const numero = turno_id == null || turno_id === '' ? '—' : String(turno_id);
  return `${formatarPeriodoTurno(periodo)} — Nº ${numero}`;
}

export function formatarDiferencaCupom(valor) {
  const n = Math.round((Number(valor) || 0) * 100) / 100;
  if (n === 0) {
    return formatarMoeda(0);
  }
  if (n > 0) {
    return `+ ${formatarMoeda(n)} (sobra)`;
  }
  return `- ${formatarMoeda(Math.abs(n))} (falta)`;
}

export function formatarDataTurno(dataIso, agora = new Date()) {
  const bruto = String(dataIso || '').slice(0, 10);
  const data = /^\d{4}-\d{2}-\d{2}$/.test(bruto) ? new Date(`${bruto}T12:00:00`) : agora;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Recife',
  }).format(data);
}

export function formatarHoraImpressao(agora = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Recife',
  }).format(agora);
}

export function htmlLinhaValor(rotulo, valorTexto) {
  return `<tr><td>${escapar(rotulo)}</td><td class="v">${escapar(valorTexto)}</td></tr>`;
}

export function completarCabecalhoComprovante(revisao, { agora = new Date(), usuario, turno } = {}) {
  const sessao = usuario ?? getUsuario();
  const turnoAtual = turno ?? peekTurno();
  return {
    ...revisao,
    operador: sessao?.nome || revisao?.operador || '',
    data: formatarDataTurno(turnoAtual?.data || revisao?.data, agora),
    hora: formatarHoraImpressao(agora),
  };
}

export function htmlPreviaImprimivel(previa) {
  return htmlComprovanteRevisao({
    periodo: previa?.periodo,
    turno_id: previa?.turno_id,
    esperado: previa?.esperado,
    contado: previa?.esperado,
    diferenca: { dinheiro: 0, pix: 0, cartao: 0, total: 0 },
    status_resumo: 'bateu certo',
  });
}

export function htmlComprovanteRevisao(revisao) {
  const esperado = revisao?.esperado || {};
  const contado = revisao?.contado || {};
  const diferenca = revisao?.diferenca || {};
  const operador = String(revisao?.operador || '').trim() || '—';
  const data = revisao?.data || formatarDataTurno('', new Date());
  const hora = revisao?.hora || formatarHoraImpressao(new Date());
  const logo = dataUriLogoCupom();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante de Fechamento de Caixa</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { margin: 0; background: #fff; color: #000; }
    .cupom {
      width: 72mm;
      margin: 0 auto;
      padding: 2mm 0;
      font-family: Consolas, 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    .logo { margin: 0 0 6px; }
    .logo img { width: 100%; height: auto; display: block; }
    .center { text-align: center; }
    .titulo { font-size: 13px; font-weight: 700; margin: 4px 0 2px; }
    .micro { font-size: 11px; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    .dado { margin: 2px 0; }
    .operador {
      border: 1px dashed #000;
      padding: 6px 8px;
      margin: 8px 0;
    }
    .operador .rotulo { font-size: 11px; }
    .operador .nome { font-weight: 700; margin: 2px 0 0; }
    .secao { margin: 8px 0; }
    .secao h2 {
      font-size: 12px;
      text-align: center;
      margin: 0 0 4px;
      text-transform: uppercase;
    }
    table.linhas { width: 100%; border-collapse: collapse; }
    table.linhas td { padding: 2px 0; vertical-align: top; }
    table.linhas .v { text-align: right; white-space: nowrap; }
    .total-destaque {
      border-top: 3px double #000;
      border-bottom: 3px double #000;
      padding: 8px 4px;
      margin: 10px 0;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
    }
    .assinatura { margin-top: 18px; text-align: center; }
    .assinatura .traco { border-bottom: 1px solid #000; width: 85%; margin: 28px auto 6px; }
    .rodape { text-align: center; font-size: 11px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="cupom">
    <div class="logo"><img alt="S&amp;M Panificadora" src="${logo}"></div>
    <div class="center titulo">Comprovante de Fechamento de Caixa</div>
    <div class="center micro">CUPOM NÃO FISCAL</div>
    <div class="center micro">Documento interno de controle — não é venda</div>
    <div class="line"></div>
    <div class="dado">Turno: ${escapar(formatarRotuloTurno(revisao))}</div>
    <div class="dado">Data: ${escapar(data)}</div>
    <div class="dado">Hora: ${escapar(hora)}</div>
    <div class="operador">
      <div class="rotulo">Operador(a) responsável</div>
      <div class="nome">${escapar(operador)}</div>
    </div>
    <div class="secao">
      <h2>Esperado</h2>
      <table class="linhas">
        ${htmlLinhaValor('Dinheiro', formatarMoeda(esperado.dinheiro))}
        ${htmlLinhaValor('Pix', formatarMoeda(esperado.pix))}
        ${htmlLinhaValor('Cartão', formatarMoeda(esperado.cartao))}
      </table>
    </div>
    <div class="secao">
      <h2>Contado</h2>
      <table class="linhas">
        ${htmlLinhaValor('Dinheiro', formatarMoeda(contado.dinheiro))}
        ${htmlLinhaValor('Pix', formatarMoeda(contado.pix))}
        ${htmlLinhaValor('Cartão', formatarMoeda(contado.cartao))}
      </table>
    </div>
    <div class="secao">
      <h2>Diferença</h2>
      <table class="linhas">
        ${htmlLinhaValor('Dinheiro', formatarDiferencaCupom(diferenca.dinheiro))}
        ${htmlLinhaValor('Pix', formatarDiferencaCupom(diferenca.pix))}
        ${htmlLinhaValor('Cartão', formatarDiferencaCupom(diferenca.cartao))}
      </table>
    </div>
    <div class="total-destaque">
      <div>${escapar(rotuloTotalDestaque(revisao?.status_resumo))}</div>
      <div>${escapar(formatarDiferencaCupom(diferenca.total))}</div>
    </div>
    <div class="assinatura">
      <div class="traco"></div>
      <div>Assinatura do operador</div>
    </div>
    <div class="line"></div>
    <div class="rodape">S&amp;M Panificadora — Souza &amp; Moraes</div>
  </div>
</body>
</html>`;
}

function rotuloTotalDestaque(statusResumo) {
  if (statusResumo === 'sobra') {
    return 'Total de sobra';
  }
  if (statusResumo === 'falta') {
    return 'Total de falta';
  }
  return 'Bateu certo';
}

function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
