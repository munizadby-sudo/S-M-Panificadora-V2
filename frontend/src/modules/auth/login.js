import { apiPost, ApiError, ErroDeRedeError, SessaoExpiradaError } from '../../core/api.js';
import { salvarSessao } from '../../core/session.js';

const MENSAGEM_CAMPOS = 'Informe usuário e senha.';
const MENSAGEM_GENERICA = 'Usuário ou senha incorretos.';

export async function autenticar(
  username,
  senha,
  redirecionar = (url) => globalThis.location.replace(url),
) {
  const usuario = String(username ?? '').trim();
  const senhaInformada = String(senha ?? '');

  if (!usuario || !senhaInformada) {
    throw new ApiError({ status: 400, mensagem: MENSAGEM_CAMPOS });
  }

  try {
    const resposta = await apiPost('/auth/login', { username: usuario, senha: senhaInformada });
    salvarSessao(resposta.token, resposta.usuario);
    redirecionar('index.html');
    return resposta;
  } catch (erro) {
    if (erro instanceof SessaoExpiradaError) {
      throw new ApiError({ status: 401, mensagem: MENSAGEM_GENERICA });
    }
    throw erro;
  }
}

export function iniciarFormularioLogin(formulario) {
  const botao = formulario.querySelector('[type="submit"]');
  const erroEl = formulario.querySelector('#login-erro');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (erroEl) {
      erroEl.textContent = '';
    }

    const username = campo(formulario, 'username');
    const senha = campo(formulario, 'senha');

    if (botao) {
      botao.disabled = true;
    }

    try {
      await autenticar(username, senha);
    } catch (erro) {
      if (erro instanceof SessaoExpiradaError) {
        return;
      }
      if (erroEl) {
        erroEl.textContent = mensagemVisivel(erro);
      }
    } finally {
      if (botao) {
        botao.disabled = false;
      }
    }
  });
}

function campo(formulario, nome) {
  if (formulario[nome] && 'value' in formulario[nome]) {
    return formulario[nome].value;
  }
  const input = formulario.querySelector(`#${nome}`);
  return input ? input.value : '';
}

function mensagemVisivel(erro) {
  if (erro instanceof ApiError || erro instanceof ErroDeRedeError) {
    return erro.mensagem || erro.message;
  }
  return erro.mensagem || erro.message || 'Não foi possível concluir a operação.';
}
