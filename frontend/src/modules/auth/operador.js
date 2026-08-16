import { getUsuario, limparSessao } from '../../core/session.js';

export function montarIdentidadeDoOperador(
  elemento,
  redirecionar = (url) => globalThis.location.replace(url),
) {
  const usuario = getUsuario();
  if (!usuario) {
    limparSessao();
    redirecionar('login.html');
    return false;
  }

  elemento.textContent = `${usuario.nome} (${usuario.role})`;
  return true;
}
