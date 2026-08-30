import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';
import { formatarHoraVenda } from './lista-turno.js';
import { rotuloFormaPagamento } from './pagamento.js';

export function htmlModalEstornoVenda({ venda, erro = '', enviando = false, motivo = '' } = {}) {
  if (!venda) {
    return '';
  }

  const numero = venda.numero ?? venda.id;
  const desabilitado = enviando ? ' disabled' : '';

  return `<div class="caixa-turno-modal" id="modal-estorno-venda" role="dialog" aria-modal="true" aria-labelledby="titulo-estorno-venda">
    <div class="caixa-turno-modal-caixa">
      <h2 id="titulo-estorno-venda">Estornar venda</h2>
      <p>Isso devolve o estoque e tira o valor do caixa. Não dá para desfazer.</p>
      <p>
        <strong>Nº ${escapar(numero)}</strong>
        — ${escapar(formatarHoraVenda(venda.criado_em))}
        — ${formatarMoeda(venda.total)}
        — ${escapar(rotuloFormaPagamento(venda.forma_pagamento))}
      </p>
      <label for="pdv-estorno-motivo">Motivo</label>
      <textarea id="pdv-estorno-motivo" rows="3" maxlength="240" ${enviando ? 'disabled' : ''}>${escapar(motivo)}</textarea>
      <p class="pdv-erro" role="alert">${escapar(erro)}</p>
      <div class="pdv-estorno-acoes">
        <button type="button" id="btn-confirmar-estorno-venda"${desabilitado}>Confirmar estorno</button>
        <button type="button" id="btn-cancelar-estorno-venda"${desabilitado}>Cancelar</button>
      </div>
    </div>
  </div>`;
}
