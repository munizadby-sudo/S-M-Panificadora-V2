import { apiDelete, apiGet, apiPatch, apiPost, apiPut, ApiError } from '../../core/api.js';

export async function listarEncomendas({
  status,
  cliente_id,
  data_entrega_inicio,
  data_entrega_fim,
  ativo,
  page = 1,
  limit = 50,
} = {}) {
  const params = { page, limit };
  if (status) {
    params.status = status;
  }
  if (cliente_id) {
    params.cliente_id = cliente_id;
  }
  if (data_entrega_inicio) {
    params.data_entrega_inicio = data_entrega_inicio;
  }
  if (data_entrega_fim) {
    params.data_entrega_fim = data_entrega_fim;
  }
  if (ativo !== undefined && ativo !== null && ativo !== '') {
    params.ativo = ativo;
  }
  return apiGet('/encomendas', params);
}

export async function buscarEncomenda(id) {
  return apiGet(`/encomendas/${id}`);
}

export async function criarEncomenda(entrada) {
  return apiPost('/encomendas', entrada);
}

export async function atualizarEncomenda(id, entrada) {
  return apiPut(`/encomendas/${id}`, entrada);
}

export async function mudarStatusEncomenda(id, status) {
  return apiPatch(`/encomendas/${id}/status`, { status });
}

export async function finalizarEncomenda(id, { forma } = {}) {
  return apiPost(`/encomendas/${id}/finalizar`, { forma });
}

export async function cancelarEncomenda(id) {
  return apiDelete(`/encomendas/${id}`);
}

export function mensagemErroEncomenda(erro) {
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message || 'Não foi possível concluir a operação.';
  }
  return erro?.mensagem || erro?.message || 'Não foi possível carregar as encomendas.';
}
