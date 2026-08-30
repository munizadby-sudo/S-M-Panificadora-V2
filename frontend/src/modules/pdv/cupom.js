import { apiGet } from '../../core/api.js';
import { imprimirHtmlEmIframe } from '../../core/impressao.js';
import { getUsuario } from '../../core/session.js';
import { abrirModalImpressaoCupom } from './modal-impressao.js';
import { formatarMoeda } from '../../core/utils.js';
import { CAMINHO_IDENTIDADE_PUBLICA, NOME_LOJA_PADRAO } from '../auth/identidade-visual.js';
import { LOGO_CUPOM_DATA_URI } from '../caixa-turno/logo-cupom-data-uri.js';
import { calcularTroco, rotuloFormaPagamento } from './pagamento.js';

function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function htmlCupomNaoFiscal({
  venda = {},
  itens = [],
  recebido = '',
  nomeLoja = NOME_LOJA_PADRAO,
  slogan = '',
  operador = '',
  dataHora = '',
} = {}) {
  const lista = Array.isArray(itens) ? itens : [];
  const total = Number(venda.total) || 0;
  const forma = venda.forma_pagamento || '';
  const numero = String(venda.numero ?? '').padStart(4, '0');
  const totalItens = lista.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);
  const dinheiro = forma === 'dinheiro';
  const valorRecebido = dinheiro && recebido !== '' ? Number(recebido) : total;
  const troco = dinheiro && recebido !== '' ? calcularTroco(recebido, total) : 0;

  const linhas = lista
    .map(
      (item) => `<tr>
      <td class="item-nome">${escapar(item.nome)}</td>
      <td class="item-qtd">${escapar(item.quantidade)}</td>
      <td class="item-preco">${formatarMoeda(item.precoUnitario)}</td>
      <td class="item-sub">${formatarMoeda(item.subtotal)}</td>
    </tr>`,
    )
    .join('');

  const blocoDinheiro = dinheiro
    ? `<tr><td>Recebido</td><td class="right">${formatarMoeda(valorRecebido)}</td></tr>
          <tr><td>Troco</td><td class="right">${formatarMoeda(troco)}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <title>Cupom ${escapar(numero)}</title>
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
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 3px 0; vertical-align: top; }
    .item-qtd, .item-preco, .item-sub, .right { text-align: right; white-space: nowrap; }
    .item-nome { width: 46%; }
    .muted { color: #333; }
  </style>
</head>
<body>
  <div class="cupom">
    <div class="logo"><img alt="${escapar(nomeLoja)}" src="${LOGO_CUPOM_DATA_URI}"></div>
    ${slogan ? `<div class="center micro">${escapar(slogan)}</div>` : ''}
    <div class="center micro">CUPOM NÃO FISCAL</div>
    <div class="line"></div>
    <div class="small">Pedido Nº ${escapar(numero)}</div>
    <div class="small">Data: ${escapar(dataHora)}</div>
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
      <tr><td class="bold">Total do pedido</td><td class="right bold">${formatarMoeda(total)}</td></tr>
      <tr><td>Forma de pagamento</td><td class="right">${escapar(rotuloFormaPagamento(forma))}</td></tr>
      ${blocoDinheiro}
      <tr><td>Total de itens</td><td class="right">${escapar(totalItens)}</td></tr>
    </table>
    <div class="line"></div>
    <div class="center micro muted">Este ticket não é documento fiscal</div>
    <div class="center micro muted">Obrigado pela preferência</div>
  </div>
</body>
</html>`;
}

/**
 * Imprime o cupom no iframe oculto — sem aba nova do Chrome.
 * Falha de impressão não desfaz a venda.
 */
export async function imprimirCupomHtml(html, imprimir = imprimirHtmlEmIframe) {
  if (typeof imprimir !== 'function') {
    throw new Error('Impressão indisponível');
  }
  await imprimir(html);
}

export async function abrirCupomNaoFiscal({ venda, itens, recebido } = {}, imprimir = imprimirCupomHtml) {
  let nomeLoja = NOME_LOJA_PADRAO;
  let slogan = '';
  try {
    const dados = await apiGet(CAMINHO_IDENTIDADE_PUBLICA);
    if (dados && typeof dados === 'object') {
      nomeLoja = dados.nome_loja || dados.nome || nomeLoja;
      slogan = dados.slogan || '';
    }
  } catch {
    /* identidade pública opcional — cupom sai com o nome padrão */
  }

  const html = htmlCupomNaoFiscal({
    venda,
    itens,
    recebido,
    nomeLoja,
    slogan,
    operador: getUsuario()?.nome || '',
    dataHora: new Date().toLocaleString('pt-BR'),
  });
  abrirModalImpressaoCupom({ html, imprimir });
}
