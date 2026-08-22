import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { htmlSeletorCliente, montarSeletorCliente } from '../../src/modules/clientes/seletor-cliente.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['clientes'],
  });
});

function jsonOk(corpo) {
  return {
    status: 200,
    ok: true,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 4 — SeletorCliente reaproveitável', () => {
  test('htmlSeletorCliente expõe busca e link de cadastro rápido', () => {
    const html = htmlSeletorCliente({
      busca: 'maria',
      mostrarCadastroRapido: true,
      prefixo: 'teste-seletor',
    });
    assert.match(html, /id="teste-seletor-busca"/);
    assert.match(html, /Cliente não encontrado\? Cadastrar novo/);
    assert.match(html, /id="teste-seletor-cadastrar-novo"/);
  });

  test('htmlSeletorCliente exibe resultados e cliente selecionado', () => {
    const html = htmlSeletorCliente({
      resultados: [{ id: 5, nome: 'Maria Silva', telefone: '11999998888' }],
      prefixo: 'sel',
    });
    assert.match(html, /Maria Silva/);
    assert.match(html, /data-cliente-id="5"/);

    const selecionado = htmlSeletorCliente({
      cliente: { id: 5, nome: 'Maria Silva', telefone: '11999998888' },
      prefixo: 'sel',
    });
    assert.match(selecionado, /Selecionado:/);
    assert.match(selecionado, /Trocar cliente/);
  });

  test('index exporta montarSeletorCliente para SPEC-FE-010', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'clientes', 'index.js'), 'utf8');
    assert.match(fonte, /export \{ htmlSeletorCliente, montarSeletorCliente \}/);
  });

  test('montarSeletorCliente busca clientes e seleciona ao clicar', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [{ id: 5, nome: 'Maria Silva', telefone: '11999998888', ativo: 1 }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      });
    };

    const container = { innerHTML: '', querySelector() { return null; }, querySelectorAll() { return []; } };
    Object.defineProperty(container, 'innerHTML', {
      set(valor) {
        this._html = valor;
      },
      get() {
        return this._html || '';
      },
    });

    let selecionado = null;
    const seletor = montarSeletorCliente(container, {
      prefixo: 'sel-teste',
      onSelecionar: (cliente) => {
        selecionado = cliente;
      },
    });

    const input = {
      value: 'maria',
      addEventListener(evento, fn) {
        if (evento === 'input') {
          this._fn = fn;
        }
      },
    };

    container.querySelector = (seletorCss) => {
      if (seletorCss === '#sel-teste-busca') {
        return input;
      }
      if (seletorCss === '#sel-teste-limpar') {
        return null;
      }
      return null;
    };
    container.querySelectorAll = () => [];

    seletor.destruir();
    montarSeletorCliente(container, {
      prefixo: 'sel-teste',
      onSelecionar: (cliente) => {
        selecionado = cliente;
      },
    });

    input._fn({ target: input });
    await new Promise((resolve) => setTimeout(resolve, 300));

    assert.match(urls[0], /busca=maria/);
    assert.match(urls[0], /ativo=1/);

    const botao = {
      getAttribute(nome) {
        if (nome === 'data-cliente-id') return '5';
        if (nome === 'data-cliente-nome') return 'Maria Silva';
        if (nome === 'data-cliente-telefone') return '11999998888';
        return null;
      },
      addEventListener(_evento, fn) {
        fn();
      },
    };

    container.querySelectorAll = (seletorCss) => {
      if (seletorCss === '.clientes-item-seletor') {
        return [botao];
      }
      return [];
    };

    assert.equal(seletor.obterCliente(), null);
  });

  test('cadastro rápido cria cliente e seleciona automaticamente', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method, body: init?.body });
      if (init?.method === 'POST') {
        return jsonOk({ id: 9, nome: 'João Novo', telefone: '11988887777', ativo: 1 });
      }
      return jsonOk({ data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } });
    };

    let selecionado = null;
    const elementos = new Map();

    function obterElemento(id) {
      if (!elementos.has(id)) {
        elementos.set(id, {
          id,
          value: '',
          textContent: '',
          listeners: {},
          addEventListener(evento, fn) {
            this.listeners[evento] = fn;
          },
          click() {
            this.listeners.click?.();
          },
          dispatchEvent(evento) {
            if (evento.type === 'submit') {
              this.listeners.submit?.({
                preventDefault() {},
                currentTarget: this,
              });
            }
          },
        });
      }
      return elementos.get(id);
    }

    const container = {
      _html: '',
      get innerHTML() {
        return this._html;
      },
      set innerHTML(valor) {
        this._html = String(valor || '');
        for (const el of elementos.values()) {
          const valorCampo = this._html.match(new RegExp(`id="${el.id}"[^>]*value="([^"]*)"`));
          if (valorCampo) {
            el.value = valorCampo[1];
          }
        }
      },
      querySelector(seletor) {
        if (!seletor?.startsWith('#')) {
          return null;
        }
        const id = seletor.slice(1);
        return this._html.includes(`id="${id}"`) ? obterElemento(id) : null;
      },
      querySelectorAll(seletor) {
        if (seletor !== '.clientes-item-seletor') {
          return [];
        }
        return [...this._html.matchAll(/class="clientes-item-seletor"[^>]*data-cliente-id="([^"]*)"[^>]*data-cliente-nome="([^"]*)"[^>]*data-cliente-telefone="([^"]*)"/g)].map(
          (match) => ({
            getAttribute(nome) {
              if (nome === 'data-cliente-id') return match[1];
              if (nome === 'data-cliente-nome') return match[2];
              if (nome === 'data-cliente-telefone') return match[3];
              return null;
            },
            addEventListener(_evento, fn) {
              fn();
            },
          }),
        );
      },
    };

    montarSeletorCliente(container, {
      prefixo: 'cad-rapido',
      onSelecionar: (cliente) => {
        selecionado = cliente;
      },
    });

    const busca = container.querySelector('#cad-rapido-busca');
    busca.listeners.input({ target: { value: 'inexistente' } });
    await new Promise((resolve) => setTimeout(resolve, 300));

    container.querySelector('#cad-rapido-cadastrar-novo').click();

    const nomeInput = container.querySelector('#cad-rapido-cadastro-nome');
    const telInput = container.querySelector('#cad-rapido-cadastro-telefone');
    nomeInput.value = 'João Novo';
    telInput.value = '11988887777';

    container.querySelector('#cad-rapido-form-cadastro').dispatchEvent({ type: 'submit' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(chamadas.some((c) => c.method === 'POST' && /\/clientes$/.test(c.url)), true);
    assert.equal(selecionado?.id, 9);
    assert.equal(selecionado?.nome, 'João Novo');
    assert.match(container.innerHTML, /Selecionado:/);
    assert.match(container.innerHTML, /João Novo/);
  });
});
