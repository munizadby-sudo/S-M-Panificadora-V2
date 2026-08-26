import { escapar, formatarMoeda } from './html.js';

export function htmlModalCancelamento({ encomenda, erro = '' }) {
  if (!encomenda) {
    return '';
  }

  return `<div class="encomendas-modal" id="modal-cancelar-encomenda" role="dialog" aria-modal="true" aria-labelledby="titulo-cancelar-encomenda">
    <div class="encomendas-modal-caixa">
      <header class="form-modal-cabecalho">
        <h2 id="titulo-cancelar-encomenda">Cancelar encomenda</h2>
      </header>
      <div class="form-modal-corpo">
        <p>Tem certeza? A encomenda continuará no histórico como cancelada.</p>
        <p><strong>Nº ${escapar(encomenda.numero)}</strong> — ${escapar(encomenda.cliente)} — ${formatarMoeda(encomenda.total)}</p>
        <p class="encomendas-erro" role="alert">${escapar(erro)}</p>
      </div>
      <div class="encomendas-form-acoes">
        <button type="button" id="btn-cancelar-modal-encomenda">Voltar</button>
        <button type="button" id="btn-confirmar-cancelamento-encomenda">Confirmar cancelamento</button>
      </div>
    </div>
  </div>`;
}
