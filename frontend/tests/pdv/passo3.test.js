import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { criarVenda, mensagemErroVenda } from '../../src/modules/pdv/api.js';
import {
  calcularTroco,
  htmlSeletorFormaPagamento,
  podeConfirmarVenda,
} from '../../src/modules/pdv/pagamento.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['caixa'],
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

describe('Passo 3 — forma de pagamento e confirmação', () => {
  test('confirmar só habilita com carrinho e forma selecionada', () => {
    const itens = [{ produtoId: 12, nome: 'Pão Francês', quantidade: 1, subtotal: 1.5 }];
    assert.equal(podeConfirmarVenda({ itens: [], formaPagamento: 'dinheiro' }), false);
    assert.equal(podeConfirmarVenda({ itens, formaPagamento: '' }), false);
    assert.equal(podeConfirmarVenda({ itens, formaPagamento: 'pix' }), true);

    const html = htmlSeletorFormaPagamento({ itens, formaPagamento: '' });
    assert.match(html, /btn-confirmar-venda" disabled/);
    assert.match(html, /data-forma="dinheiro"/);
    assert.match(html, /data-forma="pix"/);
    assert.match(html, /data-forma="cartao"/);
    assert.match(html, /data-forma="credito"/);
  });

  test('troco é recebido menos total quando a forma é dinheiro', () => {
    assert.equal(calcularTroco(20, 12.75), 7.25);
    const html = htmlSeletorFormaPagamento({
      formaPagamento: 'dinheiro',
      recebido: '20',
      itens: [{ subtotal: 12.75 }],
    });
    assert.match(html, /pdv-recebido/);
    assert.match(html, /Troco: R\$ 7,25/);
  });

  test('criarVenda envia POST /vendas sem total do cliente', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method, body: init?.body });
      return jsonOk({
        id: 481,
        numero: 1024,
        total: 12.75,
        forma_pagamento: 'dinheiro',
        status: 'confirmada',
      });
    };

    const venda = await criarVenda({
      forma_pagamento: 'dinheiro',
      itens: [
        { produto_id: 12, quantidade: 3 },
        { produto_id: 15, quantidade: 1 },
      ],
    });

    assert.equal(venda.numero, 1024);
    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/vendas$/);
    const corpo = JSON.parse(chamadas[0].body);
    assert.equal(corpo.forma_pagamento, 'dinheiro');
    assert.equal(corpo.total, undefined);
    assert.equal(corpo.itens[0].produto_id, 12);
  });

  test('403 CAIXA_FECHADO vira mensagem de negócio, não erro técnico', () => {
    const erro = new ApiError({
      status: 403,
      mensagem: 'Caixa fechado. Abra um turno antes de registrar vendas.',
      codigo: 'CAIXA_FECHADO',
    });
    assert.equal(mensagemErroVenda(erro), 'O caixa foi fechado. Recarregando status...');
  });

  test('estoque insuficiente identifica o item do carrinho pelo produto_id', () => {
    const erro = new ApiError({
      status: 400,
      mensagem: 'Estoque insuficiente para produto_id=15.',
      codigo: 'ESTOQUE_INSUFICIENTE',
    });
    const itens = [
      { produtoId: 12, nome: 'Pão Francês', quantidade: 2, subtotal: 3 },
      { produtoId: 15, nome: 'Broa', quantidade: 5, subtotal: 12.5 },
    ];
    assert.equal(mensagemErroVenda(erro, itens), 'Estoque insuficiente para Broa');
    assert.doesNotMatch(mensagemErroVenda(erro, itens), /carrinho inteiro|todos os itens/i);
  });
});
