import { escapar } from './html.js';

export const STATUS_ENCOMENDA = Object.freeze([
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'pronto', rotulo: 'Pronto' },
  { valor: 'entregue', rotulo: 'Entregue' },
]);

export function rotuloStatus(valor) {
  return STATUS_ENCOMENDA.find((item) => item.valor === valor)?.rotulo || String(valor ?? '');
}

export function htmlOpcoesStatus(valorSelecionado = 'pendente') {
  return STATUS_ENCOMENDA.map(
    (item) =>
      `<option value="${item.valor}"${item.valor === valorSelecionado ? ' selected' : ''}>${item.rotulo}</option>`,
  ).join('');
}

export function htmlSemaforoStatus(item, { admin = false } = {}) {
  const status = item.status;
  const rotulo = rotuloStatus(status);
  if (status === 'entregue') {
    const reabrir = admin
      ? `<button type="button" class="encomendas-semaforo-reabrir" data-reabrir-encomenda="${escapar(item.id)}">Reabrir</button>`
      : '';
    return `<div class="encomendas-status-celula">
      <span class="encomendas-semaforo encomendas-semaforo-entregue">
        <span class="encomendas-semaforo-bola" aria-hidden="true"></span>
        ${rotulo}
      </span>${reabrir}
    </div>`;
  }
  if (status === 'pronto') {
    return `<div class="encomendas-status-celula">
      <button type="button" class="encomendas-semaforo encomendas-semaforo-pronto" data-finalizar-encomenda="${escapar(item.id)}" title="Entregar e receber">
        <span class="encomendas-semaforo-bola" aria-hidden="true"></span>
        ${rotulo}
      </button>
      <span class="encomendas-semaforo-dica">Aguardando retirada</span>
    </div>`;
  }
  return `<button type="button" class="encomendas-semaforo encomendas-semaforo-pendente" data-avancar-status="${escapar(item.id)}" title="Marcar pronto">
    <span class="encomendas-semaforo-bola" aria-hidden="true"></span>
    ${rotulo}
  </button>`;
}
