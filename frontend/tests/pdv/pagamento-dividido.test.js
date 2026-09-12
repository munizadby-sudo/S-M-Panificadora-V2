import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  calcularValorRestante,
  htmlSeletorFormaPagamento,
  podeConfirmarVenda,
} from '../../src/modules/pdv/pagamento.js';

const itens = [{ subtotal: 10 }];

describe('Pagamento dividido em duas formas (item 9, docs/depois-do-teste.md)', () => {
  test('calcularValorRestante devolve o total menos a 1ª forma', () => {
    assert.equal(calcularValorRestante(10, 6), 4);
    assert.equal(calcularValorRestante(10, 3.33), 6.67);
  });

  test('podeConfirmarVenda: dividido precisa de 2ª forma diferente e valor entre 0 e o total', () => {
    assert.equal(
      podeConfirmarVenda({ itens, formaPagamento: 'dinheiro', dividir: true, formaPagamento2: '', valorPagamento1: '6' }),
      false,
      'sem 2ª forma',
    );
    assert.equal(
      podeConfirmarVenda({
        itens,
        formaPagamento: 'dinheiro',
        dividir: true,
        formaPagamento2: 'dinheiro',
        valorPagamento1: '6',
      }),
      false,
      'duas formas iguais',
    );
    assert.equal(
      podeConfirmarVenda({
        itens,
        formaPagamento: 'dinheiro',
        dividir: true,
        formaPagamento2: 'cartao',
        valorPagamento1: '0',
      }),
      false,
      'valor zero',
    );
    assert.equal(
      podeConfirmarVenda({
        itens,
        formaPagamento: 'dinheiro',
        dividir: true,
        formaPagamento2: 'cartao',
        valorPagamento1: '10',
      }),
      false,
      'valor igual ao total não deixa nada pra 2ª forma',
    );
    assert.equal(
      podeConfirmarVenda({
        itens,
        formaPagamento: 'dinheiro',
        dividir: true,
        formaPagamento2: 'cartao',
        valorPagamento1: '6',
      }),
      true,
      'caso válido',
    );
  });

  test('dividir não exige recebido/troco de dinheiro, mesmo se a 1ª forma for dinheiro', () => {
    assert.equal(
      podeConfirmarVenda({
        itens,
        formaPagamento: 'dinheiro',
        recebido: '',
        dividir: true,
        formaPagamento2: 'pix',
        valorPagamento1: '6',
      }),
      true,
    );
  });

  test('htmlSeletorFormaPagamento: sem dividir, não mostra o bloco de divisão', () => {
    const html = htmlSeletorFormaPagamento({ itens, formaPagamento: 'dinheiro' });
    assert.match(html, /pdv-dividir-pagamento/);
    assert.doesNotMatch(html, /pdv-valor-forma1/);
  });

  test('htmlSeletorFormaPagamento: dividido mostra valor da 1ª forma e botões da 2ª (sem a já escolhida)', () => {
    const html = htmlSeletorFormaPagamento({
      itens,
      formaPagamento: 'dinheiro',
      dividir: true,
      formaPagamento2: 'cartao',
      valorPagamento1: '6',
    });
    assert.match(html, /pdv-valor-forma1/);
    assert.match(html, /data-forma2="pix"/);
    assert.match(html, /data-forma2="cartao"/);
    assert.match(html, /data-forma2="credito"/);
    assert.doesNotMatch(html, /data-forma2="dinheiro"/);
    assert.match(html, /Restante em Débito: R\$ 4,00/);
    assert.match(html, /pdv-recebido-wrap"[^>]*hidden/);
  });

  test('htmlSeletorFormaPagamento: dividido com valor inválido desabilita confirmar', () => {
    const html = htmlSeletorFormaPagamento({
      itens,
      formaPagamento: 'dinheiro',
      dividir: true,
      formaPagamento2: 'cartao',
      valorPagamento1: '99',
    });
    assert.match(html, /id="btn-confirmar-venda" disabled/);
  });
});
