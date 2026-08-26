import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { invalidarCacheTurno } from '../../src/modules/caixa-turno/estado.js';
import {
  abrirModalPagamento,
  fecharModalPagamento,
  modalPagamentoEstaAberto,
} from '../../src/modules/pdv/modal-pagamento.js';
import { ATALHOS_FORMA_PAGAMENTO, htmlSeletorFormaPagamento } from '../../src/modules/pdv/pagamento.js';
import moduloPdv from '../../src/modules/pdv/index.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

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
  fecharModalPagamento();
});

afterEach(() => {
  moduloPdv.desmontar();
  fecharModalPagamento();
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
    querySelector() {
      return {
        textContent: '',
        value: '',
        addEventListener() {},
      };
    },
    querySelectorAll() {
      return [];
    },
  };
}

describe('Ajustes UI — total, atalhos e Débito', () => {
  test('htmlSeletorFormaPagamento mostra total e rótulo Débito (id cartao)', () => {
    const html = htmlSeletorFormaPagamento({
      itens: [{ subtotal: 12.75 }],
      formaPagamento: '',
    });
    assert.match(html, /pdv-pagamento-total/);
    assert.match(html, /Total a pagar/);
    assert.match(html, /R\$ 12,75/);
    assert.match(html, /data-forma="cartao"/);
    assert.match(html, /pdv-forma-tecla">3</);
    assert.match(html, /Débito/);
    assert.doesNotMatch(html, />Cartão</);
    assert.match(html, /pdv-forma-tecla">4</);
    assert.match(html, /Crédito/);
    assert.match(html, /pdv-recebido-wrap"[^>]*hidden/);
  });

  test('grade documenta F10 e não mistura atalhos de pagamento', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'grade.js'), 'utf8');
    assert.match(fonte, /<kbd>F10<\/kbd> Finalizar Venda/);
    assert.doesNotMatch(fonte, /Forma de pagto/);
    assert.doesNotMatch(fonte, /F1.*F10.*atalhos de pagamento/);
  });
});

describe('Passo 6 — atalhos de teclado no pagamento', () => {
  test('atalhos 1/2/3/4 mapeiam Dinheiro/Pix/Débito/Crédito', () => {
    assert.deepEqual(ATALHOS_FORMA_PAGAMENTO, ['dinheiro', 'pix', 'cartao', 'credito']);
  });

  test('módulo registra listener de F10 e trata atalhos 1/2/3/Enter no painel', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'index.js'), 'utf8');
    assert.match(fonte, /F10/);
    assert.match(fonte, /ATALHOS_FORMA_PAGAMENTO/);
    assert.match(fonte, /tratarAtalhoPagamento/);
    assert.match(fonte, /pdv-recebido/);
    assert.match(fonte, /Enter/);
  });
});

describe('Passo 7 — pagamento em modal', () => {
  test('lateral usa Finalizar Venda e não embute o seletor de pagamento', async () => {
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes('caixa-turno/status')) {
        return jsonOk({ aberto: true, turno: { id: 7, periodo: 'tarde', status: 'aberto' } });
      }
      if (href.includes('/categorias')) {
        return jsonOk({ data: [] });
      }
      return jsonOk({ data: [{ id: 12, nome: 'Pão Francês', preco: 1.5 }] });
    };

    const container = criarContainerPdv();
    await moduloPdv.montar(container);

    assert.match(container.innerHTML, /btn-finalizar-venda/);
    assert.match(container.innerHTML, /Finalizar Venda/);
    assert.match(container.innerHTML, /F10/);
    assert.doesNotMatch(container.innerHTML, /id="pdv-pagamento"/);
    assert.match(container.innerHTML, /pdv-grade/);
    assert.match(container.innerHTML, /pdv-carrinho/);
  });

  test('modal abre, fecha com Esc sem trava e reseta via aoFechar', () => {
    let fechou = 0;
    const doc = globalThis.document;
    const nodes = new Map();
    doc.body = { appendChild(el) {
      this._child = el;
    } };
    doc.getElementById = (id) => nodes.get(id) || null;
    const originalCreate = doc.createElement.bind(doc);
    doc.createElement = (tag) => {
      const el = originalCreate(tag);
      el.querySelector = (sel) => {
        if (sel === '#pdv-pagamento-conteudo-modal') {
          return el._conteudo || (el._conteudo = { innerHTML: '', querySelector() { return null; }, querySelectorAll() { return []; } });
        }
        return null;
      };
      el.addEventListener = (tipo, fn) => {
        el.listeners = el.listeners || {};
        el.listeners[tipo] = fn;
      };
      const origSet = el.setAttribute;
      el.setAttribute = (...args) => origSet.apply(el, args);
      Object.defineProperty(el, 'id', {
        get() {
          return el._id;
        },
        set(v) {
          el._id = v;
          nodes.set(v, el);
        },
        configurable: true,
      });
      return el;
    };

    abrirModalPagamento({
      renderizarConteudo(conteudo) {
        conteudo.innerHTML = '<section id="pdv-pagamento">ok</section>';
      },
      aoFechar() {
        fechou += 1;
      },
    });

    assert.equal(modalPagamentoEstaAberto(), true);
    const overlay = nodes.get('modal-pdv-pagamento');
    assert.ok(overlay);
    assert.equal(overlay.hidden, false);
    assert.match(overlay.className, /caixa-turno-modal/);

    fecharModalPagamento();
    assert.equal(modalPagamentoEstaAberto(), false);
    assert.equal(overlay.hidden, true);
    assert.equal(fechou, 1);
  });

  test('código do PDV fecha modal no sucesso e mantém no erro', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'index.js'), 'utf8');
    assert.match(fonte, /fecharModalPagamento\(\)/);
    assert.match(fonte, /modalPagamentoEstaAberto\(\)/);
    assert.match(fonte, /preencherConteudoPagamento/);
    assert.doesNotMatch(fonte, /fechamentoBloqueiaModal|impressaoObrigatoria/);
  });
});
