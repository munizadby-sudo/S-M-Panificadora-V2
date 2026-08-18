import { apiGet, apiPost, apiPut, ApiError } from '../../core/api.js';

export async function listarEstoque({ data, busca, categoria_id, produto_id, page = 1, limit = 100 } = {}) {
  const params = { page, limit };
  if (data) {
    params.data = data;
  }
  if (busca) {
    params.busca = busca;
  }
  if (categoria_id) {
    params.categoria_id = categoria_id;
  }
  if (produto_id) {
    params.produto_id = produto_id;
  }
  return apiGet('/estoque', params);
}

export async function atualizarEstoque(produtoId, entrada) {
  return apiPut(`/estoque/${produtoId}`, entrada);
}

export async function atualizarEstoqueEmLote({ data, itens }) {
  return apiPost('/estoque/lote', { data, itens });
}

export function produtoIdDoErroLote(erro) {
  const msg = String(erro?.mensagem || erro?.message || '');
  const encontrado = msg.match(/produto_id[=:\s]+(\d+)/i);
  return encontrado ? Number(encontrado[1]) : null;
}

export function mensagemErroEstoque(erro) {
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message;
  }
  return erro?.mensagem || erro?.message || 'Não foi possível carregar o estoque.';
}
