import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';
import { rotuloFormaPagamento } from './pagamento.js';

export function htmlConfirmacaoVenda(venda) {
  if (!venda) {
    return '';
  }
  return `<section class="pdv-confirmacao" id="pdv-confirmacao" role="status">
    <h2>Venda confirmada</h2>
    <p>Número: <strong id="pdv-venda-numero">${escapar(venda.numero)}</strong></p>
    <p>Total: <strong id="pdv-venda-total">${formatarMoeda(venda.total)}</strong></p>
    <p>Forma: ${escapar(rotuloFormaPagamento(venda.forma_pagamento))}</p>
  </section>`;
}
