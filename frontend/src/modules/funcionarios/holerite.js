import { dataUriLogoCupom } from '../caixa-turno/comprovante.js';
import { NOME_LOJA_PADRAO } from '../auth/identidade-visual.js';
import { formatarMoeda } from './html.js';
import { funcionarioEhQuinzenal } from './quinzena.js';
import { textoDetalheOcorrencia } from './ocorrencias.js';

const MIN_LINHAS_TABELA = 8;

export function htmlHolerite({
  folha,
  funcionario,
  ocorrencias = [],
  adiantamentos = [],
} = {}) {
  const viaEmpresa = htmlVia({
    via: 'VIA EMPRESA',
    folha,
    funcionario,
    ocorrencias,
    adiantamentos,
  });
  const viaFuncionario = htmlVia({
    via: 'VIA FUNCIONÁRIO',
    folha,
    funcionario,
    ocorrencias,
    adiantamentos,
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Recibo de pagamento — 2 vias</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }
    .holerite {
      width: 100%;
      border: 1.6px solid #000;
      page-break-after: always;
    }
    .holerite:last-child { page-break-after: auto; }
    table { border-collapse: collapse; width: 100%; }
    .cabecalho td { vertical-align: middle; padding: 8px 10px; }
    .logo img { width: 42mm; height: auto; display: block; }
    .empresa { font-size: 16px; font-weight: 700; letter-spacing: 0.2px; }
    .subtitulo { font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
    .micro { font-size: 9px; }
    .via {
      border: 1.4px solid #000;
      text-align: center;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.6px;
      padding: 10px 8px;
      width: 42mm;
      white-space: nowrap;
    }
    .bloco { border-top: 1.6px solid #000; }
    .dados td {
      border-right: 1px solid #000;
      padding: 5px 8px;
      width: 25%;
      vertical-align: top;
    }
    .dados td:last-child { border-right: 0; }
    .rotulo {
      display: block;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 1px;
    }
    .valor-campo { font-weight: 700; font-size: 12px; }
    .cols th {
      border-bottom: 1.6px solid #000;
      border-right: 1px solid #000;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 5px 6px;
      text-align: left;
      font-weight: 700;
    }
    .cols th:last-child { border-right: 0; }
    .cols .sep { border-left: 1.6px solid #000; }
    .cols td {
      border-top: 1px solid #000;
      border-right: 1px solid #000;
      padding: 4px 6px;
      height: 18px;
      vertical-align: top;
    }
    .cols td:last-child { border-right: 0; }
    .cod { width: 9%; text-align: center; }
    .desc { width: 26%; }
    .val { width: 15%; text-align: right; white-space: nowrap; }
    .totais td {
      border-top: 1.6px solid #000;
      border-right: 1px solid #000;
      padding: 7px 8px;
      width: 33.33%;
    }
    .totais td:last-child { border-right: 0; }
    .totais .rotulo { font-weight: 700; }
    .liquido { font-size: 16px; }
    .declaracao {
      padding: 8px 10px 4px;
      font-size: 10px;
    }
    .assinaturas td {
      width: 50%;
      text-align: center;
      padding: 8px 16px 12px;
      vertical-align: bottom;
    }
    .traco {
      border-bottom: 1px solid #000;
      margin: 28px 12px 6px;
    }
    .rodape {
      border-top: 1px solid #000;
      padding: 5px 10px;
      font-size: 9px;
      text-align: center;
    }
  </style>
</head>
<body>
  ${viaEmpresa}
  ${viaFuncionario}
</body>
</html>`;
}

function htmlVia({ via, folha, funcionario, ocorrencias, adiantamentos }) {
  const logo = dataUriLogoCupom();
  const nome =
    String(funcionario?.nome || folha?.funcionario_nome || '').trim() || '—';
  const cargo = String(funcionario?.cargo || '').trim() || '—';
  const codigo = folha?.funcionario_id || funcionario?.id || '—';
  const admissao = formatarDataBr(funcionario?.data_admissao);
  const pagamento = rotuloPagamento(folha, funcionario);
  const status = folha?.status === 'paga' ? 'Paga' : 'Pendente de pagamento';
  const proventos = linhasProventos(folha, ocorrencias);
  const descontos = linhasDescontos(folha, ocorrencias, adiantamentos);
  const totalProventos =
    Number(folha?.salario_base || 0) + Number(folha?.total_horas_extras || 0);
  const totalDescontos =
    Number(folha?.total_faltas || 0) +
    Number(folha?.total_nao_cumprimento || 0) +
    Number(folha?.total_adiantamentos || 0);

  return `<article class="holerite">
    <table class="cabecalho">
      <tr>
        <td style="width:48mm"><div class="logo"><img alt="${escapar(NOME_LOJA_PADRAO)}" src="${logo}"></div></td>
        <td>
          <div class="empresa">${escapar(NOME_LOJA_PADRAO)}</div>
          <div>Souza &amp; Moraes</div>
          <div class="subtitulo">Recibo de pagamento de salário</div>
          <div class="micro">Documento interno de conferência — não substitui holerite oficial</div>
        </td>
        <td class="via">${escapar(via)}</td>
      </tr>
    </table>
    <table class="dados bloco">
      <tr>
        <td><span class="rotulo">Código</span><span class="valor-campo">${escapar(codigo)}</span></td>
        <td colspan="2"><span class="rotulo">Nome do funcionário</span><span class="valor-campo">${escapar(nome)}</span></td>
        <td><span class="rotulo">Cargo</span><span class="valor-campo">${escapar(cargo)}</span></td>
      </tr>
      <tr>
        <td><span class="rotulo">Admissão</span><span class="valor-campo">${escapar(admissao)}</span></td>
        <td><span class="rotulo">Período</span><span class="valor-campo">${escapar(formatarDataBr(folha?.periodo_inicio))} a ${escapar(formatarDataBr(folha?.periodo_fim))}</span></td>
        <td><span class="rotulo">Pagamento</span><span class="valor-campo">${escapar(pagamento)}</span></td>
        <td><span class="rotulo">Situação</span><span class="valor-campo">${escapar(status)}</span></td>
      </tr>
    </table>
    ${htmlTabelaLancamentos(proventos, descontos)}
    <table class="totais bloco">
      <tr>
        <td>
          <span class="rotulo">Total de proventos</span>
          <span class="valor-campo">${escapar(formatarMoeda(totalProventos))}</span>
        </td>
        <td>
          <span class="rotulo">Total de descontos</span>
          <span class="valor-campo">${escapar(formatarMoeda(totalDescontos))}</span>
        </td>
        <td>
          <span class="rotulo">Valor líquido</span>
          <span class="valor-campo liquido">${escapar(formatarMoeda(folha?.valor_liquido))}</span>
        </td>
      </tr>
    </table>
    <div class="declaracao">
      Declaro ter recebido a importância líquida discriminada neste recibo, correspondente aos serviços prestados no período acima.
    </div>
    <table class="assinaturas">
      <tr>
        <td><div class="traco"></div>Assinatura do funcionário</td>
        <td><div class="traco"></div>Assinatura da empresa</td>
      </tr>
    </table>
    <div class="rodape">S&amp;M Panificadora — Souza &amp; Moraes · Guarde esta via. Empresa e funcionário assinam as duas.</div>
  </article>`;
}

function htmlTabelaLancamentos(proventos, descontos) {
  const linhas = Math.max(proventos.length, descontos.length, MIN_LINHAS_TABELA);
  const corpo = [];
  for (let i = 0; i < linhas; i += 1) {
    corpo.push(`<tr>
      ${htmlCelulasLancamento(proventos[i], false)}
      ${htmlCelulasLancamento(descontos[i], true)}
    </tr>`);
  }
  return `<table class="cols bloco">
    <thead>
      <tr>
        <th class="cod">Cód.</th>
        <th class="desc">Proventos</th>
        <th class="val">Valor</th>
        <th class="cod sep">Cód.</th>
        <th class="desc">Descontos</th>
        <th class="val">Valor</th>
      </tr>
    </thead>
    <tbody>${corpo.join('')}</tbody>
  </table>`;
}

function htmlCelulasLancamento(item, desconto) {
  const sep = desconto ? ' sep' : '';
  if (!item) {
    return `<td class="cod${sep}"></td><td class="desc"></td><td class="val"></td>`;
  }
  return `<td class="cod${sep}">${escapar(item.codigo)}</td>
    <td class="desc">${escapar(item.descricao)}</td>
    <td class="val">${escapar(formatarMoeda(item.valor))}</td>`;
}

function linhasProventos(folha, ocorrencias) {
  const linhas = [
    { codigo: '001', descricao: 'Salário do período', valor: folha?.salario_base },
  ];
  const extras = (ocorrencias || []).filter((item) => item.tipo === 'hora_extra');
  if (extras.length > 0) {
    for (const item of extras) {
      linhas.push({
        codigo: '002',
        descricao: descricaoOcorrencia('Hora extra', item),
        valor: item.valor,
      });
    }
    return linhas;
  }
  if (Number(folha?.total_horas_extras) > 0) {
    linhas.push({ codigo: '002', descricao: 'Horas extras', valor: folha.total_horas_extras });
  }
  return linhas;
}

function linhasDescontos(folha, ocorrencias, adiantamentos) {
  const linhas = [];
  const faltas = (ocorrencias || []).filter((item) => item.tipo === 'falta');
  const descumprimentos = (ocorrencias || []).filter((item) => item.tipo === 'nao_cumprimento');
  const vales = adiantamentos || [];

  if (faltas.length > 0) {
    for (const item of faltas) {
      linhas.push({ codigo: '101', descricao: descricaoOcorrencia('Falta', item), valor: item.valor });
    }
  } else if (Number(folha?.total_faltas) > 0) {
    linhas.push({ codigo: '101', descricao: 'Faltas', valor: folha.total_faltas });
  }

  if (descumprimentos.length > 0) {
    for (const item of descumprimentos) {
      linhas.push({
        codigo: '102',
        descricao: descricaoOcorrencia('Não cumprimento', item),
        valor: item.valor,
      });
    }
  } else if (Number(folha?.total_nao_cumprimento) > 0) {
    linhas.push({
      codigo: '102',
      descricao: 'Não cumprimento do trabalho',
      valor: folha.total_nao_cumprimento,
    });
  }

  if (vales.length > 0) {
    for (const item of vales) {
      const obs = String(item.observacao || '').trim();
      linhas.push({
        codigo: '103',
        descricao: obs
          ? `Adiantamento ${formatarDataBr(item.data)} — ${obs}`
          : `Adiantamento ${formatarDataBr(item.data)}`,
        valor: item.valor,
      });
    }
  } else if (Number(folha?.total_adiantamentos) > 0) {
    linhas.push({ codigo: '103', descricao: 'Adiantamentos', valor: folha.total_adiantamentos });
  }

  return linhas;
}

function descricaoOcorrencia(prefixo, item) {
  const detalhe = textoDetalheOcorrencia(item);
  const data = formatarDataBr(item.data);
  if (detalhe) return `${prefixo} ${data} — ${detalhe}`;
  return `${prefixo} ${data}`;
}

function rotuloPagamento(folha, funcionario) {
  if (!funcionarioEhQuinzenal(funcionario)) {
    return 'Mensal';
  }
  const inicio = String(folha?.periodo_inicio || '');
  const fim = String(folha?.periodo_fim || '');
  if (inicio.slice(8, 10) === '16') {
    return '1ª quinzena — paga dia 5';
  }
  if (fim.slice(8, 10) === '15') {
    return '2ª quinzena — paga dia 20';
  }
  return 'Quinzenal';
}

function formatarDataBr(valor) {
  const texto = String(valor || '').slice(0, 10);
  const partes = texto.split('-');
  if (partes.length !== 3 || !partes[0]) return texto || '—';
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
