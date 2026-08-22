import { apiGet, apiPost, ApiError } from '../../core/api.js';

export async function listarProducao({
  produto_id,
  data_inicio,
  data_fim,
  page = 1,
  limit = 50,
} = {}) {
  const params = { page, limit };
  if (produto_id) {
    params.produto_id = produto_id;
  }
  if (data_inicio) {
    params.data_inicio = data_inicio;
  }
  if (data_fim) {
    params.data_fim = data_fim;
  }
  return apiGet('/producao', params);
}

export async function criarProducao(entrada) {
  return apiPost('/producao', entrada);
}

export function mensagemErroProducao(erro) {
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message || 'Não foi possível concluir a operação.';
  }
  return erro?.mensagem || erro?.message || 'Não foi possível carregar a produção.';
}
