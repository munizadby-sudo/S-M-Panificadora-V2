import { escapar, formatarQuantidade } from './html.js';
import { rotuloMotivo } from './motivos.js';

export function htmlModalEstorno({ perda, erro = '' }) {
  if (!perda) {
    return '';
  }

  return `<div class="perdas-modal" id="modal-estorno-perda" role="dialog" aria-modal="true" aria-labelledby="titulo-estorno-perda">
    <div class="perdas-modal-caixa">
      <h2 id="titulo-estorno-perda">Estornar perda</h2>
      <p>Tem certeza? Isso reverte o estoque desta perda.</p>
      <p><strong>${escapar(perda.produto)}</strong> — ${formatarQuantidade(perda.quantidade)} (${escapar(rotuloMotivo(perda.motivo))}) em ${escapar(perda.data)}</p>
      <p class="perdas-erro" role="alert">${escapar(erro)}</p>
      <div class="perdas-form-acoes">
        <button type="button" id="btn-confirmar-estorno">Confirmar estorno</button>
        <button type="button" id="btn-cancelar-estorno">Cancelar</button>
      </div>
    </div>
  </div>`;
}
