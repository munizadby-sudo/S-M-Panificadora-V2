import { apiDelete, apiGet, apiPost, apiPut, ApiError } from '../../core/api.js';

export async function listarProdutos({ busca, categoria_id, ativo, page = 1, limit = 50 } = {}) {
  const params = { page, limit };
  if (busca) {
    params.busca = busca;
  }
  if (categoria_id) {
    params.categoria_id = categoria_id;
  }
  if (ativo !== undefined && ativo !== null && ativo !== '') {
    params.ativo = ativo;
  }
  return apiGet('/produtos', params);
}

export async function criarProduto(entrada) {
  return apiPost('/produtos', entrada);
}

export async function atualizarProduto(id, entrada) {
  return apiPut(`/produtos/${id}`, entrada);
}

export async function desativarProduto(id) {
  return apiDelete(`/produtos/${id}`);
}

export async function reativarProduto(id) {
  return apiPost(`/produtos/${id}/reativar`);
}

export async function listarCategorias({ ativo } = {}) {
  const params = {};
  if (ativo !== undefined && ativo !== null && ativo !== '') {
    params.ativo = ativo;
  }
  return apiGet('/categorias', params);
}

export async function criarCategoria({ nome }) {
  return apiPost('/categorias', { nome });
}

export async function desativarCategoria(id) {
  return apiDelete(`/categorias/${id}`);
}

export async function reativarCategoria(id) {
  return apiPost(`/categorias/${id}/reativar`);
}

export function mensagemErroProduto(erro) {
  if (erro instanceof ApiError && erro.status === 409) {
    return 'Já existe um produto com esse nome nessa categoria.';
  }
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message;
  }
  return erro?.mensagem || erro?.message || 'Não foi possível salvar o produto.';
}

export function mensagemErroCategoria(erro) {
  if (erro instanceof ApiError && erro.status === 409) {
    return 'Já existe uma categoria com este nome.';
  }
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message;
  }
  return erro?.mensagem || erro?.message || 'Não foi possível salvar a categoria.';
}
