import { getToken, limparSessao } from './session.js';

const MENSAGEM_ERRO_REDE = 'Não foi possível conectar. Verifique sua internet.';
const MENSAGEM_ERRO_SERVIDOR = 'Erro no servidor. Tente novamente.';
const MENSAGEM_ERRO_OPERACAO = 'Não foi possível concluir a operação.';

let apiBaseUrl = (globalThis.__API_BASE_URL__ || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor({ status, mensagem, codigo = null }) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.mensagem = mensagem;
    this.codigo = codigo;
  }
}

export class SessaoExpiradaError extends Error {
  constructor() {
    super('Sessão expirada');
    this.name = 'SessaoExpiradaError';
  }
}

export class ErroDeRedeError extends Error {
  constructor() {
    super(MENSAGEM_ERRO_REDE);
    this.name = 'ErroDeRedeError';
  }
}

export function definirApiBaseUrl(url) {
  apiBaseUrl = String(url || '').replace(/\/$/, '');
}

export function obterApiBaseUrl() {
  return apiBaseUrl;
}

export async function apiGet(caminho, params) {
  return requisitar('GET', caminho, undefined, params);
}

export async function apiPost(caminho, corpo) {
  return requisitar('POST', caminho, corpo);
}

export async function apiPut(caminho, corpo) {
  return requisitar('PUT', caminho, corpo);
}

export async function apiDelete(caminho, corpo) {
  return requisitar('DELETE', caminho, corpo);
}

async function requisitar(metodo, caminho, corpo, params) {
  const url = montarUrl(caminho, params);
  const headers = {
    Accept: 'application/json',
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init = { method: metodo, headers };
  if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(url, init);
  } catch {
    throw new ErroDeRedeError();
  }

  const dados = await lerCorpo(resposta);

  if (resposta.status === 401 && token) {
    limparSessao();
    redirecionarParaLogin();
    throw new SessaoExpiradaError();
  }

  if (!resposta.ok) {
    throw new ApiError({
      status: resposta.status,
      mensagem: extrairMensagem(dados, resposta.status),
      codigo: extrairCodigo(dados),
    });
  }

  return dados;
}

function montarUrl(caminho, params) {
  const relativo = String(caminho || '').replace(/^\//, '');
  const url = new URL(relativo, resolverBaseUrl());

  if (params && typeof params === 'object') {
    for (const [chave, valor] of Object.entries(params)) {
      if (valor === undefined || valor === null || valor === '') {
        continue;
      }
      url.searchParams.set(chave, String(valor));
    }
  }

  return url.toString();
}

function resolverBaseUrl() {
  const base = apiBaseUrl || '/api';
  if (/^https?:\/\//i.test(base)) {
    return base.endsWith('/') ? base : `${base}/`;
  }

  const origem = resolverOrigem();
  const caminhoBase = base.startsWith('/') ? base : `/${base}`;
  return `${origem}${caminhoBase.endsWith('/') ? caminhoBase : `${caminhoBase}/`}`;
}

function resolverOrigem() {
  if (globalThis.location?.origin && globalThis.location.origin !== 'null') {
    return globalThis.location.origin;
  }
  return 'http://localhost';
}

async function lerCorpo(resposta) {
  const texto = await resposta.text();
  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function extrairCodigo(corpo) {
  if (corpo && typeof corpo === 'object' && typeof corpo.codigo === 'string' && corpo.codigo.trim()) {
    return corpo.codigo.trim();
  }
  return null;
}

function extrairMensagem(corpo, status) {
  if (corpo && typeof corpo === 'object') {
    if (typeof corpo.erro === 'string' && corpo.erro.trim()) {
      return corpo.erro;
    }
    if (typeof corpo.error === 'string' && corpo.error.trim()) {
      return corpo.error;
    }
    if (corpo.error && typeof corpo.error.message === 'string' && corpo.error.message.trim()) {
      return corpo.error.message;
    }
    if (typeof corpo.mensagem === 'string' && corpo.mensagem.trim()) {
      return corpo.mensagem;
    }
    if (typeof corpo.message === 'string' && corpo.message.trim()) {
      return corpo.message;
    }
  }

  return status >= 500 ? MENSAGEM_ERRO_SERVIDOR : MENSAGEM_ERRO_OPERACAO;
}

function paginaAtualEhLogin() {
  const href = String(globalThis.location?.href || '');
  const pathname = String(globalThis.location?.pathname || '');
  return /login\.html(?:[?#]|$)/.test(href) || /login\.html$/.test(pathname);
}

function redirecionarParaLogin() {
  if (paginaAtualEhLogin()) {
    return;
  }

  const destino = 'login.html';
  if (typeof globalThis.location?.replace === 'function') {
    globalThis.location.replace(destino);
  }
}
