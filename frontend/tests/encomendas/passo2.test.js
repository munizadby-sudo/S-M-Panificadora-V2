import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { criarEncomenda, finalizarEncomenda, mensagemErroEncomenda, mudarStatusEncomenda } from '../../src/modules/encomendas/api.js';
import { htmlFormularioEncomenda } from '../../src/modules/encomendas/formulario.js';
import { validarFormularioEncomenda } from '../../src/modules/encomendas/validacao.js';
import { adicionarItem, removerItem, totalLocalItens } from '../../src/modules/encomendas/itens.js';
import moduloEncomendas from '../../src/modules/encomendas/index.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['encomendas'],
  });
});

function jsonOk(corpo, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 2 — cadastro (cliente opcional) e itens estilo carrinho', () => {
  test('validarFormularioEncomenda exige nome, telefone, data válida e ao menos um item', () => {
    const invalido = validarFormularioEncomenda({
      clienteNome: '',
      clienteTelefone: '',
      dataEntrega: 'data-invalida',
      sinal: -5,
      itens: [],
    });
    assert.equal(invalido.ok, false);
    assert.ok(invalido.erros.clienteNome);
    assert.ok(invalido.erros.clienteTelefone);
    assert.ok(invalido.erros.dataEntrega);
    assert.ok(invalido.erros.sinal);
    assert.ok(invalido.erros.itens);
  });

  test('validarFormularioEncomenda aceita entrada válida e normaliza itens', () => {
    const valido = validarFormularioEncomenda({
      clienteNome: 'Maria Souza',
      clienteTelefone: '83999998888',
      dataEntrega: '2026-08-25',
      sinal: '10',
      itens: [{ produtoId: 12, quantidade: 5 }],
    });
    assert.equal(valido.ok, true);
    assert.equal(valido.valores.sinal, 10);
    assert.deepEqual(valido.valores.itens, [{ produto_id: 12, quantidade: 5 }]);
  });

  test('adicionarItem soma quantidade quando o mesmo produto é adicionado de novo', () => {
    let itens = adicionarItem([], { id: 12, nome: 'Pão Francês', preco: 1.5 }, 5);
    itens = adicionarItem(itens, { id: 12, nome: 'Pão Francês', preco: 1.5 }, 3);
    assert.equal(itens.length, 1);
    assert.equal(itens[0].quantidade, 8);
    assert.equal(itens[0].subtotal, 12);
  });

  test('removerItem tira o produto da lista', () => {
    const itens = adicionarItem([], { id: 12, nome: 'Pão Francês', preco: 1.5 }, 5);
    const restante = removerItem(itens, 12);
    assert.equal(restante.length, 0);
  });

  test('totalLocalItens soma os subtotais — usado só como prévia, nunca enviado como total oficial', () => {
    const itens = adicionarItem(
      adicionarItem([], { id: 1, nome: 'A', preco: 2 }, 3),
      { id: 2, nome: 'B', preco: 5 },
      1,
    );
    assert.equal(totalLocalItens(itens), 11);
  });

  test('criarEncomenda envia POST /encomendas', async () => {
    const urls = [];
    const corpos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      corpos.push(JSON.parse(init.body));
      return jsonOk({ id: 3, numero: 45, total: 15, status: 'pendente' });
    };

    const resposta = await criarEncomenda({
      cliente_nome: 'Maria Souza',
      cliente_telefone: '83999998888',
      data_entrega: '2026-08-25',
      itens: [{ produto_id: 12, quantidade: 10 }],
    });
    assert.match(urls[0], /\/encomendas$/);
    assert.equal(corpos[0].cliente_nome, 'Maria Souza');
    assert.equal(resposta.numero, 45);
  });

  test('mudarStatusEncomenda envia PATCH /encomendas/:id/status', async () => {
    const urls = [];
    const metodos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      metodos.push(init.method);
      return jsonOk({ id: 3, status: 'pronto' });
    };

    await mudarStatusEncomenda(3, 'pronto');
    assert.match(urls[0], /\/encomendas\/3\/status$/);
    assert.equal(metodos[0], 'PATCH');
  });

  test('finalizarEncomenda envia POST /encomendas/:id/finalizar com a forma', async () => {
    const urls = [];
    const metodos = [];
    const corpos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      metodos.push(init.method);
      corpos.push(JSON.parse(init.body));
      return jsonOk({ id: 3, status: 'entregue' });
    };

    await finalizarEncomenda(3, { forma: 'pix' });
    assert.match(urls[0], /\/encomendas\/3\/finalizar$/);
    assert.equal(metodos[0], 'POST');
    assert.equal(corpos[0].forma, 'pix');
  });

  test('mensagemErroEncomenda devolve a mensagem do backend', () => {
    const msg = mensagemErroEncomenda(new ApiError({ status: 404, mensagem: 'Cliente não encontrado.' }));
    assert.equal(msg, 'Cliente não encontrado.');
  });

  test('formulário isola o seletor de produto para não remontar o modal a cada busca', () => {
    const html = htmlFormularioEncomenda({
      formulario: {
        clienteNome: '',
        clienteTelefone: '',
        dataEntrega: '2026-08-26',
        sinal: '',
        observacoes: '',
        buscaProdutoItem: 'f',
        produtoItem: { id: 12, nome: 'Pão Francês', preco: 12 },
        quantidadeItem: '',
        itens: [],
      },
      resultadosProdutoItem: [],
    });
    assert.match(html, /id="encomenda-item-seletor"/);
    assert.match(html, /Selecionado:/);
    assert.match(html, /Pão Francês/);
    assert.match(html, /12,00/);
  });

  test('busca e seleção de produto não zeram o scroll do modal', async () => {
    const produto = { id: 12, nome: 'Pão Francês', preco: 12, custo: 12 };
    globalThis.fetch = async (url) => {
      if (String(url).includes('/produtos')) {
        return jsonOk({ data: [produto], pagination: { page: 1, limit: 8, total: 1, pages: 1 } });
      }
      return jsonOk({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0, hasPrevious: false, hasNext: false },
      });
    };

    const corpoModal = { scrollTop: 0 };
    const overlay = { scrollTop: 0 };
    const elementos = new Map();
    let botoesProduto = [];
    let seletorHtml = '';

    function obter(id) {
      if (!elementos.has(id)) {
        elementos.set(id, {
          id,
          value: '',
          disabled: false,
          listeners: {},
          focus() {},
          setSelectionRange() {},
          addEventListener(evento, fn) {
            this.listeners[evento] = fn;
          },
        });
      }
      return elementos.get(id);
    }

    const seletorClienteAlvo = {
      _html: '',
      closest(sel) {
        if (sel === '.form-modal-corpo') return corpoModal;
        if (sel === '.encomendas-modal') return overlay;
        return null;
      },
      get innerHTML() {
        return this._html;
      },
      set innerHTML(valor) {
        this._html = String(valor || '');
      },
      querySelector(sel) {
        if (!sel?.startsWith('#')) {
          return null;
        }
        const id = sel.slice(1);
        return this._html.includes(`id="${id}"`) ? obter(id) : null;
      },
      querySelectorAll() {
        return [];
      },
    };

    const seletorAlvo = {
      get innerHTML() {
        return seletorHtml;
      },
      set innerHTML(valor) {
        seletorHtml = String(valor || '');
        botoesProduto = [...seletorHtml.matchAll(/data-produto-id="([^"]*)"[^>]*data-produto-nome="([^"]*)"[^>]*data-produto-custo="([^"]*)"/g)].map(
          (match) => ({
            getAttribute(nome) {
              if (nome === 'data-produto-id') return match[1];
              if (nome === 'data-produto-nome') return match[2];
              if (nome === 'data-produto-custo') return match[3];
              return null;
            },
            addEventListener(evento, fn) {
              if (evento === 'click') {
                this._click = fn;
              }
            },
            click() {
              this._click?.();
            },
          }),
        );
      },
    };

    const container = {
      _html: '',
      get innerHTML() {
        return this._html;
      },
      set innerHTML(valor) {
        this._html = String(valor || '');
      },
      querySelector(sel) {
        if (sel === '.form-modal-corpo') {
          return this._html.includes('form-modal-corpo') ? corpoModal : null;
        }
        if (sel === '.encomendas-modal') {
          return this._html.includes('encomendas-modal') ? overlay : null;
        }
        if (sel === '#encomenda-item-seletor') {
          return this._html.includes('encomenda-item-seletor') ? seletorAlvo : null;
        }
        if (sel === '#encomenda-cliente-seletor') {
          return this._html.includes('encomenda-cliente-seletor') ? seletorClienteAlvo : null;
        }
        if (sel?.startsWith('#')) {
          const id = sel.slice(1);
          const visivel = this._html.includes(`id="${id}"`) || seletorHtml.includes(`id="${id}"`);
          return visivel ? obter(id) : null;
        }
        return null;
      },
      querySelectorAll(sel) {
        if (sel === '.perdas-item-produto') {
          return botoesProduto;
        }
        return [];
      },
    };

    await moduloEncomendas.montar(container);
    container.querySelector('#btn-abrir-form-encomenda').listeners.click();
    corpoModal.scrollTop = 260;
    overlay.scrollTop = 40;

    const busca = container.querySelector('#perda-busca-produto');
    busca.value = 'f';
    busca.listeners.input({ target: busca });
    await new Promise((resolve) => setTimeout(resolve, 300));

    assert.equal(corpoModal.scrollTop, 260);
    assert.equal(overlay.scrollTop, 40);
    assert.match(seletorHtml, /Pão Francês/);

    const [resultado] = container.querySelectorAll('.perdas-item-produto');
    resultado.click();

    assert.match(seletorHtml, /Selecionado:/);
    assert.match(seletorHtml, /12,00/);
    assert.equal(corpoModal.scrollTop, 260);
    assert.equal(overlay.scrollTop, 40);

    moduloEncomendas.desmontar();
  });
});
