import { apiGet } from '../../core/api.js';
import { imprimirHtmlEmIframe } from '../../core/impressao.js';
import { getUsuario } from '../../core/session.js';
import { formatarMoeda } from '../../core/utils.js';
import { CAMINHO_IDENTIDADE_PUBLICA, NOME_LOJA_PADRAO } from '../auth/identidade-visual.js';
import { LOGO_CUPOM_DATA_URI } from '../caixa-turno/logo-cupom-data-uri.js';
import { abrirModalImpressaoCupom } from '../pdv/modal-impressao.js';
import { rotuloFormaPagamento } from '../pdv/pagamento.js';
import { escapar, formatarQuantidade } from './html.js';

export function formatarDataEntrega(iso) {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return String(iso || '—');
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function resolverItensCupom(itens = [], produtos = []) {
  return (Array.isArray(itens) ? itens : []).map((item) => {
    const produtoId = item.produtoId ?? item.produto_id;
    const doCatalogo = produtos.find((produto) => Number(produto.id) === Number(produtoId));
    return {
      nome: item.nome || doCatalogo?.nome || `Produto #${produtoId}`,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario ?? item.preco_unitario,
      subtotal: item.subtotal,
    };
  });
}

export function htmlCupomEncomendaDuasVias({
  encomenda = {},
  itens = [],
  recebidoSinal = '',
  nomeLoja = NOME_LOJA_PADRAO,
  slogan = '',
  operador = '',
  dataHora = '',
} = {}) {
  const viaCliente = htmlViaEncomenda({
    via: 'VIA CLIENTE',
    rodape: 'Guarde este comprovante. Apresente na retirada.',
    encomenda,
    itens,
    recebidoSinal,
    nomeLoja,
    slogan,
    operador,
    dataHora,
  });
  const viaLoja = htmlViaEncomenda({
    via: 'VIA ESTABELECIMENTO',
    rodape: 'Via da loja — fica no estabelecimento.',
    encomenda,
    itens,
    recebidoSinal,
    nomeLoja,
    slogan,
    operador,
    dataHora,
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <title>Encomenda ${escapar(encomenda.numero ?? '')} — 2 vias</title>
  <style>
    @page { margin: 6mm; }
    body {
      margin: 0;
      font-family: Consolas, 'Courier New', monospace;
      background: #fff;
      color: #111;
      font-size: 13px;
      line-height: 1.45;
    }
    .cupom { width: 72mm; margin: 0 auto; padding: 4mm 0; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .logo { margin: 0 0 4px; }
    .logo img { width: 100%; height: auto; display: block; }
    .micro { font-size: 12px; }
    .small { font-size: 13px; }
    .line { border-top: 1px dashed #111; margin: 6px 0; }
    .corte { border-top: 1px dashed #111; margin: 10px 0 8px; text-align: center; font-size: 11px; }
    .via-selo { font-weight: 700; letter-spacing: 0.4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 3px 0; vertical-align: top; }
    .item-qtd, .item-preco, .item-sub, .right { text-align: right; white-space: nowrap; }
    .item-nome { width: 46%; }
    .muted { color: #333; }
  </style>
</head>
<body>
  ${viaCliente}
  <div class="corte">✂ corte</div>
  ${viaLoja}
</body>
</html>`;
}

function htmlViaEncomenda({
  via,
  rodape,
  encomenda,
  itens,
  recebidoSinal,
  nomeLoja,
  slogan,
  operador,
  dataHora,
}) {
  const lista = resolverItensCupom(itens);
  const total = Number(encomenda.total) || 0;
  const sinal = Number(encomenda.sinal) || 0;
  const saldo =
    encomenda.saldo_a_receber != null
      ? Number(encomenda.saldo_a_receber)
      : Math.max(0, Math.round((total - sinal) * 100) / 100);
  const numero = String(encomenda.numero ?? '').padStart(4, '0');
  const cliente = encomenda.cliente_nome || encomenda.cliente || '—';
  const telefone = encomenda.cliente_telefone || '';
  const forma = encomenda.forma_sinal || encomenda.forma || '';
  const dinheiro = forma === 'dinheiro' && recebidoSinal !== '' && sinal > 0;
  const troco = dinheiro
    ? Math.round((Number(recebidoSinal) - sinal) * 100) / 100
    : 0;

  const linhas = lista
    .map(
      (item) => `<tr>
      <td class="item-nome">${escapar(item.nome)}</td>
      <td class="item-qtd">${escapar(formatarQuantidade(item.quantidade))}</td>
      <td class="item-preco">${formatarMoeda(item.precoUnitario)}</td>
      <td class="item-sub">${formatarMoeda(item.subtotal)}</td>
    </tr>`,
    )
    .join('');

  const blocoSinal =
    sinal > 0
      ? `<tr><td>Sinal</td><td class="right">${formatarMoeda(sinal)}</td></tr>
        ${forma ? `<tr><td>Forma do sinal</td><td class="right">${escapar(rotuloFormaPagamento(forma))}</td></tr>` : ''}
        ${
          dinheiro
            ? `<tr><td>Recebido</td><td class="right">${formatarMoeda(recebidoSinal)}</td></tr>
               <tr><td>Troco</td><td class="right">${formatarMoeda(troco)}</td></tr>`
            : ''
        }`
      : '<tr><td>Sinal</td><td class="right">Paga na retirada</td></tr>';

  const obs = String(encomenda.observacoes || '').trim();

  return `<div class="cupom">
    <div class="logo"><img alt="${escapar(nomeLoja)}" src="${LOGO_CUPOM_DATA_URI}"></div>
    ${slogan ? `<div class="center micro">${escapar(slogan)}</div>` : ''}
    <div class="center micro">CUPOM NÃO FISCAL</div>
    <div class="center via-selo">${escapar(via)}</div>
    <div class="line"></div>
    <div class="small">Encomenda Nº ${escapar(numero)}</div>
    <div class="small">Emitido: ${escapar(dataHora)}</div>
    <div class="small">Entrega: ${escapar(formatarDataEntrega(encomenda.data_entrega))}</div>
    <div class="small">Cliente: ${escapar(cliente)}</div>
    ${telefone ? `<div class="small">Telefone: ${escapar(telefone)}</div>` : ''}
    <div class="small">Operador: ${escapar(operador || '—')}</div>
    <div class="line"></div>
    <table>
      <thead>
        <tr>
          <th class="item-nome">Produto</th>
          <th class="item-qtd">Qtd</th>
          <th class="item-preco">Vr. Unt.</th>
          <th class="item-sub">Sub.</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="line"></div>
    <table>
      <tr><td class="bold">Total</td><td class="right bold">${formatarMoeda(total)}</td></tr>
      ${blocoSinal}
      <tr><td class="bold">Saldo a pagar</td><td class="right bold">${formatarMoeda(saldo)}</td></tr>
    </table>
    ${obs ? `<div class="line"></div><div class="small">Obs.: ${escapar(obs)}</div>` : ''}
    <div class="line"></div>
    <div class="center micro muted">${escapar(rodape)}</div>
    <div class="center micro muted">Este ticket não é documento fiscal</div>
  </div>`;
}

export async function imprimirCupomEncomendaHtml(html, imprimir = imprimirHtmlEmIframe) {
  if (typeof imprimir !== 'function') {
    throw new Error('Impressão indisponível');
  }
  await imprimir(html);
}

export async function abrirCupomEncomenda(
  { encomenda, itens = [], produtos = [], recebidoSinal = '' } = {},
  imprimir = imprimirCupomEncomendaHtml,
) {
  let nomeLoja = NOME_LOJA_PADRAO;
  let slogan = '';
  try {
    const dados = await apiGet(CAMINHO_IDENTIDADE_PUBLICA);
    if (dados && typeof dados === 'object') {
      nomeLoja = dados.nome_loja || dados.nome || nomeLoja;
      slogan = dados.slogan || '';
    }
  } catch {
    /* identidade pública opcional */
  }

  const html = htmlCupomEncomendaDuasVias({
    encomenda,
    itens: resolverItensCupom(itens, produtos),
    recebidoSinal,
    nomeLoja,
    slogan,
    operador: getUsuario()?.nome || '',
    dataHora: new Date().toLocaleString('pt-BR'),
  });
  abrirModalImpressaoCupom({
    html,
    imprimir,
    titulo: 'Imprimir encomenda (2 vias)',
  });
}
