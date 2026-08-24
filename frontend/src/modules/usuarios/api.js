import { apiDelete, apiGet, apiPost, apiPut, ApiError } from '../../core/api.js';

export async function listarUsuarios({ page = 1, limit = 20 } = {}) {
  return apiGet('/usuarios', { page, limit });
}

export async function criarUsuario(entrada) {
  return apiPost('/usuarios', entrada);
}

export async function atualizarUsuario(id, entrada) {
  return apiPut(`/usuarios/${id}`, entrada);
}

export async function desativarUsuario(id) {
  return apiDelete(`/usuarios/${id}`);
}

export function mensagemErroUsuario(erro) {
  if (erro instanceof ApiError && erro.status === 409) {
    return 'Username já existe.';
  }
  if (erro instanceof ApiError && erro.status === 400 && /próprio usuário/i.test(erro.mensagem || '')) {
    return erro.mensagem || 'Você não pode desativar seu próprio usuário.';
  }
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message;
  }
  return erro?.mensagem || erro?.message || 'Não foi possível salvar o usuário.';
}
