import { apiDelete, apiGet, apiPost, apiPut, ApiError } from '../../core/api.js';

export async function listarClientes({ busca, ativo, page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (busca) {
    params.busca = busca;
  }
  if (ativo !== undefined && ativo !== null && ativo !== '') {
    params.ativo = ativo;
  }
  return apiGet('/clientes', params);
}

export async function criarCliente(entrada) {
  return apiPost('/clientes', entrada);
}

export async function atualizarCliente(id, entrada) {
  return apiPut(`/clientes/${id}`, entrada);
}

export async function desativarCliente(id) {
  return apiDelete(`/clientes/${id}`);
}

export async function reativarCliente(id) {
  return apiPost(`/clientes/${id}/reativar`);
}

export function mensagemErroCliente(erro) {
  if (erro instanceof ApiError && erro.status === 409) {
    return 'Já existe um cliente ativo com este telefone.';
  }
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message;
  }
  return erro?.mensagem || erro?.message || 'Não foi possível salvar o cliente.';
}
