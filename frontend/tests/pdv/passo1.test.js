import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { invalidarCacheTurno } from '../../src/modules/caixa-turno/estado.js';
import { htmlAvisoCaixaFechado, irParaTelaDeCaixa } from '../../src/modules/pdv/aviso.js';
import moduloPdv from '../../src/modules/pdv/index.js';

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
  moduloPdv.desmontar();
  invalidarCacheTurno();
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

function criarContainerPdv() {
  return {
    _html: '',
    get innerHTML() {
      return this._html;
    },
    set innerHTML(valor) {
      this._html = String(valor || '');
    },
    querySelector(sel) {
      if (sel?.startsWith('#') && this._html.includes(`id="${sel.slice(1)}"`)) {
        return {
          textContent: '',
          dataset: {},
          addEventListener() {},
        };
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

describe('Passo 1 — banner e bloqueio com caixa fechado', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloPdv.id, 'pdv');
    assert.equal(moduloPdv.label, 'Vendas');
    assert.equal(moduloPdv.icone, 'ti-shopping-cart');
    assert.equal(moduloPdv.permissao, 'caixa');
    assert.equal(typeof moduloPdv.montar, 'function');
    assert.equal(typeof moduloPdv.desmontar, 'function');
  });

  test('aviso de caixa fechado tem mensagem de negócio e atalho para Caixa', () => {
    const html = htmlAvisoCaixaFechado();
    assert.match(html, /Abra o caixa para começar a vender/);
    assert.match(html, /btn-ir-para-caixa/);
    assert.match(html, /Ir para Caixa/);
  });

  test('atalho dispara o módulo de caixa no menu', () => {
    let clicado = false;
    globalThis.document = {
      querySelector(sel) {
        if (sel === '[data-modulo-id="caixa-turno"]') {
          return { click() { clicado = true; } };
        }
        return null;
      },
    };
    irParaTelaDeCaixa();
    assert.equal(clicado, true);
  });

  test('com turno fechado monta o aviso e não monta grade nem carrinho', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ aberto: false, turno: null });
    };

    const container = criarContainerPdv();
    await moduloPdv.montar(container);

    assert.match(container.innerHTML, /Abra o caixa para começar a vender/);
    assert.match(container.innerHTML, /aviso-caixa-fechado/);
    assert.match(container.innerHTML, /pdv-banner/);
    assert.doesNotMatch(container.innerHTML, /pdv-grade/);
    assert.doesNotMatch(container.innerHTML, /pdv-carrinho/);
    assert.equal(urls.every((url) => !url.includes('/produtos')), true);
    assert.equal(urls.some((url) => url.includes('caixa-turno/status')), true);
  });

  test('com turno aberto mostra a grade, sem o aviso de bloqueio', async () => {
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes('caixa-turno/status')) {
        return jsonOk({ aberto: true, turno: { id: 7, periodo: 'tarde', status: 'aberto' } });
      }
      return jsonOk({ data: [{ id: 12, nome: 'Pão Francês', preco: 1.5 }] });
    };

    const container = criarContainerPdv();
    await moduloPdv.montar(container);

    assert.doesNotMatch(container.innerHTML, /aviso-caixa-fechado/);
    assert.match(container.innerHTML, /pdv-grade/);
    assert.match(container.innerHTML, /Pão Francês/);
  });

  test('módulo pdv nunca chama GET caixa-turno/status diretamente', () => {
    const raiz = join(frontend, 'src', 'modules', 'pdv');
    const arquivos = readdirSync(raiz)
      .filter((entrada) => extname(entrada) === '.js')
      .map((entrada) => join(raiz, entrada));

    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(fonte, /caixa-turno\/status/, `${arquivo} não pode consultar status direto`);
    }

    const indexFonte = readFileSync(join(raiz, 'index.js'), 'utf8');
    assert.match(indexFonte, /caixa-turno\/estado\.js/);
    assert.match(indexFonte, /getTurnoAtual/);
    assert.match(indexFonte, /turnoEstaAberto/);
  });

  test('index.html registra o módulo pdv como primeiro do menu', () => {
    assert.match(indexHtml, /modules\/pdv\/index\.js/);
    const trecho = indexHtml.split('criarRouter()')[1];
    const pdv = trecho.indexOf('registrarModulo(moduloPdv)');
    const caixa = trecho.indexOf('registrarModulo(moduloCaixa)');
    assert.ok(pdv >= 0 && caixa > pdv);
  });
});
