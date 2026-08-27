import { escapar, formatarMoeda } from './html.js';
import { podeConfirmarPagamento, textoTroco } from './sinal.js';

const FORMAS = [
  { id: 'dinheiro', tecla: '1', rotulo: 'Dinheiro' },
  { id: 'pix', tecla: '2', rotulo: 'Pix' },
  { id: 'cartao', tecla: '3', rotulo: 'Débito' },
  { id: 'credito', tecla: '4', rotulo: 'Crédito' },
];

export function formaPeloAtalho(tecla) {
  return FORMAS.find((item) => item.tecla === String(tecla))?.id || '';
}

export function saldoAReceber(encomenda) {
  const total = Number(encomenda?.total) || 0;
  const sinal = Number(encomenda?.sinal) || 0;
  const saldo = Math.round((total - sinal) * 100) / 100;
  return saldo > 0 ? saldo : 0;
}

export function htmlBlocoPagamentoEncomenda({
  valorACobrar,
  forma = '',
  recebido = '',
  inputId = 'encomenda-recebido',
} = {}) {
  const valor = Number(valorACobrar) || 0;
  if (!(valor > 0)) {
    return '';
  }
  const dinheiro = forma === 'dinheiro';
  const troco = dinheiro ? textoTroco(recebido, valor) : null;
  const formas = `<div class="encomendas-formas" role="group" aria-label="Forma de pagamento">
        ${FORMAS.map(
          (item) => `<button type="button" class="encomendas-forma${forma === item.id ? ' ativo' : ''}" data-forma-encomenda="${item.id}">
            <span class="encomendas-forma-tecla">${item.tecla}</span>
            ${item.rotulo}
          </button>`,
        ).join('')}
      </div>`;
  const painelDinheiro = `<div id="${escapar(inputId)}-wrap" class="pdv-recebido-painel"${dinheiro ? '' : ' hidden'}>
      <label for="${escapar(inputId)}">Valor recebido (R$)</label>
      <input type="number" min="0" step="0.01" id="${escapar(inputId)}" name="recebido" value="${escapar(recebido)}" inputmode="decimal" placeholder="0,00">
      <p id="${escapar(inputId)}-troco"${troco == null ? ' hidden' : ''}>${troco == null ? '' : `Troco: ${formatarMoeda(troco)}`}</p>
    </div>`;
  return `${formas}${painelDinheiro}`;
}

export function htmlModalFinalizarEncomenda({
  encomenda,
  forma = '',
  recebido = '',
  erro = '',
} = {}) {
  if (!encomenda) {
    return '';
  }
  const saldo = saldoAReceber(encomenda);
  const pagamento =
    saldo > 0
      ? htmlBlocoPagamentoEncomenda({
          valorACobrar: saldo,
          forma,
          recebido,
          inputId: 'encomenda-finalizar-recebido',
        })
      : '<p class="encomendas-finalizar-ajuda">O sinal cobre o total. Confirme a entrega.</p>';

  const confirmarDesabilitado = podeConfirmarPagamento({
    valorACobrar: saldo,
    forma,
    recebido,
  })
    ? ''
    : ' disabled';

  return `<div class="encomendas-modal" id="modal-finalizar-encomenda" role="dialog" aria-modal="true" aria-labelledby="titulo-finalizar-encomenda">
    <form id="form-finalizar-encomenda" class="encomendas-modal-caixa encomendas-form" data-encomenda-id="${escapar(encomenda.id)}" tabindex="-1">
      <header class="form-modal-cabecalho">
        <h2 id="titulo-finalizar-encomenda">Finalizar encomenda Nº ${escapar(encomenda.numero)}</h2>
      </header>
      <div class="form-modal-corpo">
        <p>${escapar(encomenda.cliente)} — entrega ${escapar(encomenda.data_entrega)}</p>
        <p>Total <strong>${formatarMoeda(encomenda.total)}</strong> · Sinal ${formatarMoeda(encomenda.sinal)}</p>
        <p class="encomendas-finalizar-saldo">Valor a receber: <strong>${formatarMoeda(saldo)}</strong></p>
        ${pagamento}
        <p class="encomendas-erro" role="alert">${escapar(erro)}</p>
      </div>
      <div class="encomendas-form-acoes">
        <button type="button" id="btn-cancelar-finalizar-encomenda">Cancelar</button>
        <button type="submit" id="btn-confirmar-finalizar-encomenda"${confirmarDesabilitado}>Confirmar entrega</button>
      </div>
    </form>
  </div>`;
}
