import { apiDelete, apiGet, apiPost, apiPut, ApiError } from '../../core/api.js';

export async function listarFuncionarios({ busca, ativo, page = 1, limit = 50 } = {}) {
  const params = { page, limit };
  if (busca) params.busca = busca;
  if (ativo !== undefined && ativo !== null && ativo !== '') params.ativo = ativo;
  return apiGet('/funcionarios', params);
}

export async function criarFuncionario(entrada) {
  return apiPost('/funcionarios', entrada);
}

export async function atualizarFuncionario(id, entrada) {
  return apiPut(`/funcionarios/${id}`, entrada);
}

export async function desativarFuncionario(id) {
  return apiDelete(`/funcionarios/${id}`);
}

export async function reativarFuncionario(id) {
  return apiPost(`/funcionarios/${id}/reativar`);
}

export async function listarAdiantamentos(filtros = {}) {
  return apiGet('/adiantamentos', comPaginacao(filtros));
}

export async function criarAdiantamento(entrada) {
  return apiPost('/adiantamentos', entrada);
}

export async function listarOcorrencias(filtros = {}) {
  return apiGet('/ocorrencias-folha', comPaginacao(filtros));
}

export async function criarOcorrencia(entrada) {
  return apiPost('/ocorrencias-folha', entrada);
}

export async function listarFolhas(filtros = {}) {
  return apiGet('/folhas', comPaginacao(filtros));
}

export async function fecharFolha(entrada) {
  return apiPost('/folhas', entrada);
}

export async function marcarFolhaPaga(id) {
  return apiPost(`/folhas/${id}/pagar`);
}

export function mensagemErroFuncionarios(erro) {
  if (erro instanceof ApiError && erro.status === 409) {
    return erro.mensagem || 'Já existe folha fechada para este funcionário neste período.';
  }
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message || 'Não foi possível concluir a operação.';
  }
  return erro?.mensagem || erro?.message || 'Não foi possível carregar os dados.';
}

function comPaginacao(filtros) {
  const params = { page: filtros.page || 1, limit: filtros.limit || 50 };
  for (const [chave, valor] of Object.entries(filtros)) {
    if (chave === 'page' || chave === 'limit') continue;
    if (valor !== undefined && valor !== null && valor !== '') params[chave] = valor;
  }
  return params;
}
