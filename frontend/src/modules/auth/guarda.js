  // Importa a função que checa se o token existe no localStorage
  import { estaAutenticado } from '../../core/session.js';

  export function protegerShell(redirecionar = (url) => window.location.replace(url)) {
    // Se não tem sessão, manda pro login e avisa que barrou (false)
    if (!estaAutenticado()) {
      redirecionar('login.html');
      return false;
    }
    
    // Se tem sessão, deixa passar (true)
    return true;
  }

export function redirecionarSeAutenticado(redirecionar = (url) => globalThis.location.replace(url)) {
  if (estaAutenticado()) {
    redirecionar('index.html');
    return true;
  }
  return false;
}
