import { limparSessao } from '../../core/session.js';

export function sair(redirecionar = (url) => globalThis.location.replace(url)) {
  limparSessao();
  redirecionar('login.html');
}
