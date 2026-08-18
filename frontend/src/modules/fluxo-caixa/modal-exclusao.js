import { escapar, rotuloOrigem, rotuloTipo } from './html.js';

export function htmlModalExclusao({ lancamento, erro = '' }) {
  if (!lancamento) {
    return '';
  }

  return `<div class="fluxo-modal" role="dialog" aria-labelledby="titulo-excluir-fluxo">
    <div class="fluxo-modal-caixa">
      <h2 id="titulo-excluir-fluxo">Excluir lançamento</h2>
      <p><strong>${escapar(lancamento.descricao)}</strong> — ${escapar(rotuloTipo(lancamento.tipo))}, ${escapar(rotuloOrigem(lancamento.gerado_auto))}</p>
      <label>Motivo (obrigatório)
        <textarea id="fluxo-motivo-exclusao" rows="3" maxlength="500"></textarea>
      </label>
      <p id="fluxo-erro-exclusao" class="fluxo-erro" role="alert">${escapar(erro)}</p>
      <div class="fluxo-form-acoes">
        <button type="button" id="btn-cancelar-exclusao-fluxo">Cancelar</button>
        <button type="button" id="btn-confirmar-exclusao-fluxo">Confirmar exclusão</button>
      </div>
    </div>
  </div>`;
}

export function podeExcluirLancamento(lancamento, ehAdmin) {
  if (!lancamento) {
    return false;
  }
  const automatico = Number(lancamento.gerado_auto) === 1;
  return !automatico || ehAdmin;
}
