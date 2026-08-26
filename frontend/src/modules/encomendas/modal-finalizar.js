import { escapar, formatarMoeda } from './html.js';

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

export function htmlModalFinalizarEncomenda({ encomenda, forma = '', erro = '' } = {}) {
  if (!encomenda) {
    return '';
  }
  const saldo = saldoAReceber(encomenda);
  const formas =
    saldo > 0
      ? `<div class="encomendas-formas" role="group" aria-label="Forma de pagamento">
        ${FORMAS.map(
          (item) => `<button type="button" class="encomendas-forma${forma === item.id ? ' ativo' : ''}" data-forma-encomenda="${item.id}">
            <span class="encomendas-forma-tecla">${item.tecla}</span>
            ${item.rotulo}
          </button>`,
        ).join('')}
      </div>`
      : '<p class="encomendas-finalizar-ajuda">O sinal cobre o total. Confirme a entrega.</p>';

  const confirmarDesabilitado = saldo > 0 && !forma ? ' disabled' : '';

  return `<div class="encomendas-modal" id="modal-finalizar-encomenda" role="dialog" aria-modal="true" aria-labelledby="titulo-finalizar-encomenda">
    <form id="form-finalizar-encomenda" class="encomendas-modal-caixa encomendas-form" data-encomenda-id="${escapar(encomenda.id)}" tabindex="-1">
      <header class="form-modal-cabecalho">
        <h2 id="titulo-finalizar-encomenda">Finalizar encomenda Nº ${escapar(encomenda.numero)}</h2>
      </header>
      <div class="form-modal-corpo">
        <p>${escapar(encomenda.cliente)} — entrega ${escapar(encomenda.data_entrega)}</p>
        <p>Total <strong>${formatarMoeda(encomenda.total)}</strong> · Sinal ${formatarMoeda(encomenda.sinal)}</p>
        <p class="encomendas-finalizar-saldo">Valor a receber: <strong>${formatarMoeda(saldo)}</strong></p>
        ${formas}
        <p class="encomendas-erro" role="alert">${escapar(erro)}</p>
      </div>
      <div class="encomendas-form-acoes">
        <button type="button" id="btn-cancelar-finalizar-encomenda">Cancelar</button>
        <button type="submit"${confirmarDesabilitado}>Confirmar entrega</button>
      </div>
    </form>
  </div>`;
}
