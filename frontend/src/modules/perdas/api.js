import { apiDelete, apiGet, apiPost, ApiError } from '../../core/api.js';

export async function listarPerdas({
  produto_id,
  motivo,
  data_inicio,
  data_fim,
  ativo,
  page = 1,
  limit = 50,
} = {}) {
  const params = { page, limit };
  if (produto_id) {
    params.produto_id = produto_id;
  }
  if (motivo) {
    params.motivo = motivo;
  }
  if (data_inicio) {
    params.data_inicio = data_inicio;
  }
  if (data_fim) {
    params.data_fim = data_fim;
  }
  if (ativo !== undefined && ativo !== null && ativo !== '') {
    params.ativo = ativo;
  }
  return apiGet('/perdas', params);
}

export async function criarPerda(entrada) {
  return apiPost('/perdas', entrada);
}

export async function estornarPerda(id) {
  return apiDelete(`/perdas/${id}`);
}

export function mensagemErroPerda(erro) {
  if (erro instanceof ApiError) {
    const mensagem = erro.mensagem || erro.message || '';
    if (erro.status === 400 && /insuficiente/i.test(mensagem)) {
      return 'Estoque insuficiente para registrar essa perda.';
    }
    return mensagem || 'Não foi possível concluir a operação.';
  }
  return erro?.mensagem || erro?.message || 'Não foi possível carregar as perdas.';
}
