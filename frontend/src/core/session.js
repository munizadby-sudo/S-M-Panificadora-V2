export const CHAVE_STORAGE_TOKEN = 'sm.panificadora.token';
export const CHAVE_STORAGE_USUARIO = 'sm.panificadora.usuario';

function armazenamento() {
  const storage = globalThis.localStorage;
  if (!storage) {
    throw new Error('localStorage indisponível');
  }
  return storage;
}

export function salvarSessao(token, usuario) {
  const storage = armazenamento();
  storage.setItem(CHAVE_STORAGE_TOKEN, token);
  storage.setItem(CHAVE_STORAGE_USUARIO, JSON.stringify(usuario));
}

export function limparSessao() {
  const storage = armazenamento();
  storage.removeItem(CHAVE_STORAGE_TOKEN);
  storage.removeItem(CHAVE_STORAGE_USUARIO);
}

export function getToken() {
  return armazenamento().getItem(CHAVE_STORAGE_TOKEN);
}

export function getUsuario() {
  const bruto = armazenamento().getItem(CHAVE_STORAGE_USUARIO);
  if (!bruto) {
    return null;
  }

  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

export function estaAutenticado() {
  return Boolean(getToken());
}

export function temPermissao(modulo) {
  const usuario = getUsuario();
  if (!usuario) {
    return false;
  }
  if (usuario.role === 'admin') {
    return true;
  }
  return Array.isArray(usuario.permissoes) && usuario.permissoes.includes(modulo);
}
