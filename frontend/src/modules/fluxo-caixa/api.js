import { apiDelete, apiGet, apiPost, ApiError } from '../../core/api.js';

export async function listarFluxoCaixa(params = {}) {
  return apiGet('/fluxo-caixa', params);
}

export async function obterResumoFluxo(turnoId) {
  return apiGet('/fluxo-caixa/resumo', { turno_id: turnoId });
}

export async function criarLancamentoManual(corpo) {
  return apiPost('/fluxo-caixa', corpo);
}

export async function excluirLancamento(id, motivo) {
  return apiDelete(`/fluxo-caixa/${id}`, { motivo });
}

export function mensagemErroFluxo(erro) {
  if (erro instanceof ApiError) {
    if (erro.codigo === 'CAIXA_FECHADO') {
      return 'Caixa fechado. Abra um turno antes de registrar lançamentos.';
    }
    return erro.mensagem;
  }
  return 'Não foi possível concluir a operação.';
}
