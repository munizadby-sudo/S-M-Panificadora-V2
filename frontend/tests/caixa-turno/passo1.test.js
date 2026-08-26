import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import {
  getTurnoAtual,
  invalidarCacheTurno,
  onMudancaDeTurno,
  turnoEstaAberto,
} from '../../src/modules/caixa-turno/estado.js';
import { montarBanner, textoDoBanner } from '../../src/modules/caixa-turno/banner.js';
import {
  abrirModalCaixa,
  fecharModalCaixa,
  modalCaixaEstaAberto,
  mostrarCorrecoes,
} from '../../src/modules/caixa-turno/index.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const indexHtml = readFileSync(join(frontend, 'index.html'), 'utf8');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  invalidarCacheTurno();
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['caixa'],
  });
});

afterEach(() => {
  fecharModalCaixa();
  invalidarCacheTurno();
});

describe('Passo 1 — estado e banner de caixa', () => {
  test('getTurnoAtual consome GET /caixa-turno/status e cacheia', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return {
        status: 200,
        ok: true,
        async text() {
          return JSON.stringify({ aberto: false, turno: null });
        },
      };
    };

    const primeiro = await getTurnoAtual();
    const segundo = await getTurnoAtual();
    assert.equal(primeiro.aberto, false);
    assert.equal(turnoEstaAberto(), false);
    assert.equal(urls.length, 1);
    assert.match(urls[0], /caixa-turno\/status/);
    assert.equal(segundo.aberto, false);

    let notificado = null;
    const cancelar = onMudancaDeTurno((status) => {
      notificado = status;
    });
    globalThis.fetch = async () => ({
      status: 200,
      ok: true,
      async text() {
        return JSON.stringify({
          aberto: true,
          turno: { id: 1, periodo: 'tarde', status: 'aberto' },
        });
      },
    });
    await getTurnoAtual({ forcar: true });
    assert.equal(turnoEstaAberto(), true);
    assert.equal(notificado.aberto, true);
    cancelar();
  });

  test('banner mostra Caixa fechado e Caixa aberto com período', async () => {
    assert.equal(textoDoBanner({ aberto: false, turno: null }), 'Caixa fechado');
    assert.equal(
      textoDoBanner({ aberto: true, turno: { periodo: 'manha' } }),
      'Caixa aberto — manhã',
    );

    globalThis.fetch = async () => ({
      status: 200,
      ok: true,
      async text() {
        return JSON.stringify({ aberto: false, turno: null });
      },
    });
    const el = { innerHTML: '', dataset: {} };
    await montarBanner(el);
    assert.match(el.innerHTML, /caixa-turno-banner-bola/);
    assert.match(el.innerHTML, /Caixa fechado/);
    assert.equal(el.dataset.aberto, 'false');
  });

  test('módulo exporta API de modal (SPEC-FE-015 §7)', () => {
    assert.equal(typeof abrirModalCaixa, 'function');
    assert.equal(typeof fecharModalCaixa, 'function');
    assert.equal(typeof modalCaixaEstaAberto, 'function');
    assert.equal(typeof mostrarCorrecoes, 'function');
  });

  test('nenhum outro módulo chama GET caixa-turno/status direto', () => {
    const raiz = join(frontend, 'src');
    const arquivos = readdirSync(raiz, { recursive: true })
      .filter((entrada) => extname(entrada) === '.js')
      .map((entrada) => join(raiz, entrada));

    for (const arquivo of arquivos) {
      if (arquivo.endsWith(`${join('caixa-turno', 'estado.js')}`)) {
        continue;
      }
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(
        fonte,
        /caixa-turno\/status/,
        `${arquivo} não pode consultar status direto`,
      );
    }
  });

  test('index.html monta banner clicável no header sem registrar rota de caixa', () => {
    assert.match(indexHtml, /id="caixa-turno-banner"/);
    assert.match(indexHtml, /<button[^>]*id="caixa-turno-banner"/);
    assert.match(indexHtml, /modules\/caixa-turno/);
    assert.match(indexHtml, /montarBanner/);
    assert.match(indexHtml, /abrirModalCaixa/);
    assert.doesNotMatch(indexHtml, /registrarModulo\(moduloCaixa\)/);
  });

  test('indicador de turno fica no header (.topo-direita), não entre nav e main', () => {
    const shell = indexHtml.match(/<div id="app-shell"[\s\S]*?<\/div>\s*<script type="module">/)?.[0] || '';
    assert.match(
      shell,
      /topo-direita[\s\S]*?id="caixa-turno-banner"[\s\S]*?usuario-logado[\s\S]*?btn-logout/,
    );
    assert.doesNotMatch(
      shell,
      /id="menu-principal"[\s\S]*?id="caixa-turno-banner"/,
    );
    assert.match(shell, /id="menu-principal"[\s\S]*?<main id="conteudo">/);
  });

  test('módulo caixa-turno não duplica o banner de status', () => {
    const fonteModulo = readFileSync(join(frontend, 'src', 'modules', 'caixa-turno', 'index.js'), 'utf8');
    assert.doesNotMatch(fonteModulo, /caixa-turno-status-modulo/);
    assert.doesNotMatch(fonteModulo, /montarBanner/);
    assert.doesNotMatch(fonteModulo, /cancelarBanner/);
    assert.match(fonteModulo, /abrirModalCaixa/);
    assert.doesNotMatch(fonteModulo, /fechamentoBloqueiaModal/);
  });

  test('X/Esc fecham o modal mesmo na revisão com Confirmar desabilitado', async () => {
    instalarDocumentoModal();
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes('caixa-turno/status')) {
        return {
          status: 200,
          ok: true,
          async text() {
            return JSON.stringify({
              aberto: true,
              turno: { id: 9, periodo: 'tarde', status: 'aberto' },
            });
          },
        };
      }
      if (href.includes('preview-fechamento')) {
        return {
          status: 200,
          ok: true,
          async text() {
            return JSON.stringify({
              turno_id: 9,
              periodo: 'tarde',
              esperado: { dinheiro: 100, pix: 50, cartao: 30, moedas: 0 },
            });
          },
        };
      }
      return {
        status: 200,
        ok: true,
        async text() {
          return JSON.stringify({ aberto: true, turno: { id: 9, periodo: 'tarde', status: 'aberto' } });
        },
      };
    };

    await abrirModalCaixa();
    assert.equal(modalCaixaEstaAberto(), true);

    const painel = globalThis.document.body
      .querySelector('#caixa-turno-conteudo-modal')
      ?.querySelector('#caixa-turno-painel');
    assert.ok(painel);

    const btnFecharCaixa = painel.querySelector('#btn-fechar-caixa');
    await btnFecharCaixa.listeners.click[0]();

    const area = painel.querySelector('#area-fechamento');
    for (const id of ['fechamento-dinheiro', 'fechamento-moedas', 'fechamento-pix', 'fechamento-cartao']) {
      area.querySelector(`#${id}`).value = '10';
      area.querySelector(`#${id}`).listeners.input?.forEach((fn) => fn({ target: area.querySelector(`#${id}`) }));
    }

    const form = area.querySelector('#form-contagem-caixa');
    form.listeners.submit[0]({ preventDefault() {} });

    const confirmar = area.querySelector('#btn-confirmar-fechamento');
    assert.ok(confirmar);
    assert.equal(confirmar.disabled, true);

    fecharModalCaixa();
    assert.equal(modalCaixaEstaAberto(), false);

    await abrirModalCaixa();
    assert.equal(modalCaixaEstaAberto(), true);
    const painelReaberto = globalThis.document.body
      .querySelector('#caixa-turno-conteudo-modal')
      ?.querySelector('#caixa-turno-painel');
    assert.match(painelReaberto?.innerHTML || '', /btn-fechar-caixa/);
    assert.doesNotMatch(painelReaberto?.innerHTML || '', /btn-confirmar-fechamento/);
    fecharModalCaixa();
  });
});

function instalarDocumentoModal() {
  const docListeners = { keydown: [] };

  function criarElemento(tag) {
    const el = {
      tagName: String(tag).toUpperCase(),
      id: '',
      type: '',
      value: '',
      hidden: false,
      disabled: false,
      textContent: '',
      className: '',
      dataset: {},
      _html: '',
      _filhos: [],
      listeners: {},
      classList: {
        toggle() {},
      },
      get innerHTML() {
        return el._html;
      },
      set innerHTML(valor) {
        el._html = String(valor || '');
        el._filhos = [];
        for (const match of el._html.matchAll(/\bid="([^"]+)"/g)) {
          const filho = criarElemento('div');
          filho.id = match[1];
          const tagAberta = el._html.match(new RegExp(`<[a-z0-9]+[^>]*\\bid="${filho.id}"[^>]*>`, 'i'));
          if (tagAberta) {
            if (/\bdisabled\b/i.test(tagAberta[0])) {
              filho.disabled = true;
            }
            if (/^<input\b/i.test(tagAberta[0])) {
              filho.tagName = 'INPUT';
              filho.value = '';
            }
            if (/^<button\b/i.test(tagAberta[0])) {
              filho.tagName = 'BUTTON';
            }
            if (/^<form\b/i.test(tagAberta[0])) {
              filho.tagName = 'FORM';
            }
            if (/^<textarea\b/i.test(tagAberta[0])) {
              filho.tagName = 'TEXTAREA';
              filho.value = '';
            }
          }
          el._filhos.push(filho);
        }
      },
      querySelector(sel) {
        if (!sel?.startsWith('#')) {
          return null;
        }
        const id = sel.slice(1);
        const fila = [...el._filhos];
        while (fila.length) {
          const atual = fila.shift();
          if (atual.id === id) {
            return atual;
          }
          fila.push(...(atual._filhos || []));
        }
        return null;
      },
      querySelectorAll() {
        return [];
      },
      setAttribute(nome, valor) {
        if (nome === 'id') {
          el.id = String(valor);
        }
      },
      getAttribute(nome) {
        return nome === 'id' ? el.id || null : null;
      },
      addEventListener(evento, fn) {
        el.listeners[evento] = el.listeners[evento] || [];
        el.listeners[evento].push(fn);
      },
      removeEventListener(evento, fn) {
        el.listeners[evento] = (el.listeners[evento] || []).filter((item) => item !== fn);
      },
      appendChild(filho) {
        el._filhos.push(filho);
      },
    };
    return el;
  }

  const body = criarElemento('body');
  globalThis.document = {
    body,
    createElement: criarElemento,
    getElementById(id) {
      const fila = [...body._filhos];
      while (fila.length) {
        const atual = fila.shift();
        if (atual.id === id) {
          return atual;
        }
        fila.push(...(atual._filhos || []));
      }
      return null;
    },
    addEventListener(evento, fn) {
      docListeners[evento] = docListeners[evento] || [];
      docListeners[evento].push(fn);
    },
    removeEventListener(evento, fn) {
      docListeners[evento] = (docListeners[evento] || []).filter((item) => item !== fn);
    },
  };
}
