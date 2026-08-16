import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from './helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../src/core/api.js';
import {
  CHAVE_STORAGE_TOKEN,
  CHAVE_STORAGE_USUARIO,
  estaAutenticado,
  getToken,
  getUsuario,
  limparSessao,
  salvarSessao,
} from '../src/core/session.js';
import { autenticar, iniciarFormularioLogin } from '../src/modules/auth/login.js';
import { protegerShell, redirecionarSeAutenticado } from '../src/modules/auth/guarda.js';
import { sair } from '../src/modules/auth/sair.js';
import { montarIdentidadeDoOperador } from '../src/modules/auth/operador.js';
import {
  CAMINHO_IDENTIDADE_PUBLICA,
  aplicarIdentidadeVisual,
} from '../src/modules/auth/identidade-visual.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..');
const loginHtml = readFileSync(join(frontend, 'login.html'), 'utf8');
const indexHtml = readFileSync(join(frontend, 'index.html'), 'utf8');
const pastaAuth = join(frontend, 'src', 'modules', 'auth');

const usuarioAdmin = {
  id: 1,
  nome: 'Administrador',
  username: 'admin',
  role: 'admin',
  permissoes: ['caixa'],
};

let fetchOriginal;

beforeEach(() => {
  instalarAmbienteDeTeste({ href: 'http://127.0.0.1:4173/login.html' });
  definirApiBaseUrl('/api');
  fetchOriginal = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

function mockFetch(implementacao) {
  globalThis.fetch = implementacao;
}

function respostaJson(status, corpo) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 1 — tela de login estática', () => {
  test('formulário tem campos, botão Entrar clicável e não chama API no markup', () => {
    assert.match(loginHtml, /id="form-login"/);
    assert.match(loginHtml, /id="username"/);
    assert.match(loginHtml, /id="senha"/);
    assert.match(loginHtml, /type="password"/);
    assert.match(loginHtml, /<button type="submit">Entrar<\/button>/);
    assert.doesNotMatch(loginHtml, /<button type="submit"[^>]*\bdisabled\b/);
    assert.doesNotMatch(loginHtml, /apiPost/);
    assert.doesNotMatch(loginHtml, /sessionStorage/);
  });
});

describe('Passo 2 — login via core/api.js', () => {
  test('sucesso grava sessão com o usuario da resposta e vai para o shell', async () => {
    let corpoEnviado;
    mockFetch(async (_url, init) => {
      corpoEnviado = JSON.parse(init.body);
      return respostaJson(200, { token: 'jwt-ok', usuario: usuarioAdmin });
    });

    await autenticar('  admin  ', 'segredo');

    assert.deepEqual(corpoEnviado, { username: 'admin', senha: 'segredo' });
    assert.equal(getToken(), 'jwt-ok');
    assert.deepEqual(getUsuario(), usuarioAdmin);
    assert.match(globalThis.location.href, /index\.html$/);
  });

  test('campos vazios não chamam a API', async () => {
    let chamadas = 0;
    mockFetch(async () => {
      chamadas += 1;
      return respostaJson(200, { token: 'x', usuario: usuarioAdmin });
    });

    await assert.rejects(() => autenticar('  ', ''), ApiError);
    assert.equal(chamadas, 0);
    assert.equal(estaAutenticado(), false);
  });

  test('401 de credencial vira ApiError genérico e não grava sessão', async () => {
    mockFetch(async () =>
      respostaJson(401, { erro: 'Usuário ou senha incorretos.' }),
    );

    await assert.rejects(
      () => autenticar('admin', 'errada'),
      (erro) => {
        assert.ok(erro instanceof ApiError);
        assert.equal(erro.status, 401);
        assert.equal(erro.mensagem, 'Usuário ou senha incorretos.');
        return true;
      },
    );
    assert.equal(estaAutenticado(), false);
    assert.equal(globalThis.location.replaceCount, 0);
  });

  test('submit mostra a mensagem no #login-erro e reabilita o botão', async () => {
    mockFetch(async () =>
      respostaJson(401, { error: { message: 'Usuário ou senha incorretos.' } }),
    );

    const { formulario, botao, erroEl, submeter } = criarFormularioFake('admin', 'x');
    iniciarFormularioLogin(formulario);
    await submeter();

    assert.equal(erroEl.textContent, 'Usuário ou senha incorretos.');
    assert.equal(botao.disabled, false);
  });

  test('autenticar usa apiPost e nenhum arquivo de auth chama fetch()', () => {
    const arquivos = listarJs(pastaAuth);
    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(fonte, /\bfetch\s*\(/, arquivo);
      assert.doesNotMatch(fonte, /console\.log/);
    }
  });
});

describe('Passo 3 — guarda do shell', () => {
  test('sem sessão redireciona para login e retorna false', () => {
    limparSessao();
    const destinos = [];
    const podeSeguir = protegerShell((url) => destinos.push(url));
    assert.equal(podeSeguir, false);
    assert.deepEqual(destinos, ['login.html']);
  });

  test('com sessão permite seguir e não redireciona', () => {
    salvarSessao('token', usuarioAdmin);
    const destinos = [];
    const podeSeguir = protegerShell((url) => destinos.push(url));
    assert.equal(podeSeguir, true);
    assert.deepEqual(destinos, []);
  });

  test('index.html usa protegerShell antes de carregar o router', () => {
    assert.match(indexHtml, /modules\/auth\/guarda\.js/);
    assert.match(indexHtml, /protegerShell/);
    const depoisDaGuarda = indexHtml.split('protegerShell()')[1];
    assert.match(depoisDaGuarda, /import\('\.\/src\/core\/router\.js'\)/);
  });
});

describe('Passo 4 — logout', () => {
  test('sair limpa token e usuário e vai para login com replace', () => {
    salvarSessao('token', usuarioAdmin);
    sair();
    assert.equal(estaAutenticado(), false);
    assert.equal(getUsuario(), null);
    assert.equal(localStorage.getItem(CHAVE_STORAGE_TOKEN), null);
    assert.equal(localStorage.getItem(CHAVE_STORAGE_USUARIO), null);
    assert.match(globalThis.location.href, /login\.html$/);
  });

  test('index.html liga o botão Sair em sair()', () => {
    assert.match(indexHtml, /id="btn-logout"/);
    assert.match(indexHtml, /modules\/auth\/sair\.js/);
    assert.match(indexHtml, /sair\(\)/);
  });
});

describe('Passo 5 — nome e papel no shell', () => {
  test('preenche Nome (role) a partir de getUsuario()', () => {
    salvarSessao('token', usuarioAdmin);
    const el = { textContent: '' };
    assert.equal(montarIdentidadeDoOperador(el, () => {}), true);
    assert.equal(el.textContent, 'Administrador (admin)');
  });

  test('usuário ausente limpa sessão e redireciona como a guarda do shell', () => {
    salvarSessao('token', usuarioAdmin);
    localStorage.removeItem(CHAVE_STORAGE_USUARIO);
    const destinos = [];
    const el = { textContent: '' };
    assert.equal(montarIdentidadeDoOperador(el, (url) => destinos.push(url)), false);
    assert.equal(estaAutenticado(), false);
    assert.deepEqual(destinos, ['login.html']);
    assert.equal(el.textContent, '');
  });
});

describe('Passo 6 — guarda inversa do login', () => {
  test('com sessão redireciona para o shell', () => {
    salvarSessao('token', usuarioAdmin);
    const destinos = [];
    assert.equal(redirecionarSeAutenticado((url) => destinos.push(url)), true);
    assert.deepEqual(destinos, ['index.html']);
  });

  test('sem sessão permanece no login', () => {
    const destinos = [];
    assert.equal(redirecionarSeAutenticado((url) => destinos.push(url)), false);
    assert.deepEqual(destinos, []);
  });

  test('login.html chama redirecionarSeAutenticado antes de ligar o formulário', () => {
    assert.match(loginHtml, /redirecionarSeAutenticado/);
    const depois = loginHtml.split('redirecionarSeAutenticado()')[1];
    assert.match(depois, /iniciarFormularioLogin/);
  });
});

describe('Passo 7 — 401 autenticado fica só no core', () => {
  test('módulo auth não trata status 401 para redirecionar', () => {
    for (const arquivo of listarJs(pastaAuth)) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(
        fonte,
        /status\s*===?\s*401/,
        `${arquivo} não deve copiar o tratamento de 401`,
      );
      assert.doesNotMatch(fonte, /SessaoExpiradaError[\s\S]*replace\(['"]login\.html/);
    }
  });
});

describe('Passo 8 — identidade visual sem cache de sessão', () => {
  test('sucesso aplica nome, slogan e logo sem sessionStorage', async () => {
    mockFetch(async (url) => {
      assert.match(String(url), /configuracoes\/publico/);
      return respostaJson(200, {
        nome_loja: 'Padaria Teste',
        slogan: 'Pão quente',
        logo_url: 'http://127.0.0.1/logo.png',
      });
    });

    const titulo = { textContent: 'S&M Panificadora' };
    const slogan = { textContent: 'Entre com seu usuário para acessar o sistema.' };
    const logo = { src: '', hidden: true };

    await aplicarIdentidadeVisual({ titulo, slogan, logo });

    assert.equal(titulo.textContent, 'Padaria Teste');
    assert.equal(slogan.textContent, 'Pão quente');
    assert.equal(logo.src, 'http://127.0.0.1/logo.png');
    assert.equal(logo.hidden, false);
    assert.equal(typeof sessionStorage, 'undefined');
  });

  test('falha do GET público mantém o padrão e não impede o login', async () => {
    mockFetch(async () => {
      throw new TypeError('fetch failed');
    });

    const titulo = { textContent: 'S&M Panificadora' };
    await aplicarIdentidadeVisual({ titulo });
    assert.equal(titulo.textContent, 'S&M Panificadora');
  });

  test('login.html não lê identidade de sessionStorage', () => {
    assert.doesNotMatch(loginHtml, /sessionStorage/);
    assert.match(loginHtml, /aplicarIdentidadeVisual/);
    assert.equal(CAMINHO_IDENTIDADE_PUBLICA, '/configuracoes/publico');
  });
});

function criarFormularioFake(username, senha) {
  const botao = { disabled: false, type: 'submit' };
  const erroEl = { id: 'login-erro', textContent: '' };
  const campos = {
    username: { value: username },
    senha: { value: senha },
  };
  const listeners = {};
  const formulario = {
    username: campos.username,
    senha: campos.senha,
    querySelector(seletor) {
      if (seletor.includes('submit')) return botao;
      if (seletor.includes('login-erro')) return erroEl;
      return null;
    },
    addEventListener(evento, fn) {
      listeners[evento] = fn;
    },
  };
  return {
    formulario,
    botao,
    erroEl,
    async submeter() {
      await listeners.submit({ preventDefault() {} });
    },
  };
}

function listarJs(diretorio) {
  return readdirSync(diretorio, { recursive: true })
    .filter((entrada) => extname(entrada) === '.js')
    .map((entrada) => join(diretorio, entrada));
}
