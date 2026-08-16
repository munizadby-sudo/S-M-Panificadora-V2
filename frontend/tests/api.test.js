import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from './helpers/ambiente.js';
import {
  ApiError,
  ErroDeRedeError,
  SessaoExpiradaError,
  apiGet,
  apiPost,
  definirApiBaseUrl,
} from '../src/core/api.js';
import { estaAutenticado, getToken, salvarSessao } from '../src/core/session.js';

const usuario = {
  id: 1,
  nome: 'Admin',
  username: 'admin',
  role: 'admin',
  permissoes: ['caixa'],
};

let fetchOriginal;

beforeEach(() => {
  instalarAmbienteDeTeste({ href: 'http://127.0.0.1:4173/index.html' });
  definirApiBaseUrl('/api');
  fetchOriginal = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

function mockFetch(implementacao) {
  globalThis.fetch = implementacao;
}

describe('api', () => {
  test('anexa Authorization Bearer a partir da sessão', async () => {
    salvarSessao('jwt-123', usuario);
    let requisicao;
    mockFetch(async (url, init) => {
      requisicao = { url: String(url), init };
      return respostaJson(200, { ok: true });
    });

    const dados = await apiGet('/produtos');
    assert.equal(dados.ok, true);
    assert.match(requisicao.url, /\/api\/produtos$/);
    assert.equal(requisicao.init.headers.Authorization, 'Bearer jwt-123');
  });

  test('401 com token limpa a sessão, redireciona uma vez e lança SessaoExpiradaError', async () => {
    salvarSessao('jwt-expirado', usuario);
    mockFetch(async () => respostaJson(401, { error: { message: 'Token inválido' } }));

    await Promise.all([
      assert.rejects(() => apiGet('/auth/me'), SessaoExpiradaError),
      assert.rejects(() => apiGet('/produtos'), SessaoExpiradaError),
    ]);

    assert.equal(estaAutenticado(), false);
    assert.equal(getToken(), null);
    assert.equal(globalThis.location.replaceCount, 1);
    assert.match(globalThis.location.href, /login\.html$/);
  });

  test('401 sem token vira ApiError e não redireciona', async () => {
    mockFetch(async () => respostaJson(401, { erro: 'Usuário ou senha incorretos.' }));

    await assert.rejects(
      () => apiPost('/auth/login', { username: 'x', senha: 'y' }),
      (erro) => {
        assert.ok(erro instanceof ApiError);
        assert.equal(erro.status, 401);
        assert.equal(erro.mensagem, 'Usuário ou senha incorretos.');
        return true;
      },
    );
    assert.equal(globalThis.location.replaceCount, 0);
  });

  test('4xx/5xx lançam ApiError com mensagem do backend, sem corpo bruto', async () => {
    mockFetch(async () =>
      respostaJson(400, { error: { code: 'VALIDATION', message: 'Informe o nome.' } }),
    );

    await assert.rejects(
      () => apiPost('/produtos', { nome: '' }),
      (erro) => {
        assert.ok(erro instanceof ApiError);
        assert.equal(erro.status, 400);
        assert.equal(erro.mensagem, 'Informe o nome.');
        assert.equal('error' in erro, false);
        return true;
      },
    );
  });

  test('falha de rede lança ErroDeRedeError com mensagem amigável', async () => {
    mockFetch(async () => {
      throw new TypeError('fetch failed');
    });

    await assert.rejects(
      () => apiGet('/health'),
      (erro) => {
        assert.ok(erro instanceof ErroDeRedeError);
        assert.equal(erro.message, 'Não foi possível conectar. Verifique sua internet.');
        return true;
      },
    );
  });

  test('apiGet envia query string a partir dos params', async () => {
    let urlCapturada;
    mockFetch(async (url) => {
      urlCapturada = String(url);
      return respostaJson(200, { data: [] });
    });

    await apiGet('/produtos', { page: 2, q: 'pão', vazio: '' });
    assert.match(urlCapturada, /page=2/);
    assert.match(urlCapturada, /q=p%C3%A3o/);
    assert.doesNotMatch(urlCapturada, /vazio=/);
  });
});

function respostaJson(status, corpo) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}
