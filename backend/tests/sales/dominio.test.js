import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Venda, VendaItem } from '../../src/modules/sales/domain/Venda.js';
import {
  CarrinhoVazioError,
  FormaPagamentoInvalidaError,
  PagamentosInvalidosError,
  TotalExternoError,
  TurnoObrigatorioError,
} from '../../src/modules/sales/domain/erros.js';

describe('domínio Venda', () => {
  test('exige pelo menos um item', () => {
    assert.throws(
      () =>
        new Venda({
          numero: 1,
          turnoId: 10,
          usuarioId: 2,
          formaPagamento: 'dinheiro',
          itens: [],
        }),
      CarrinhoVazioError,
    );
  });

  test('total é sempre a soma dos subtotais — nunca aceita total externo', () => {
    assert.throws(
      () =>
        new Venda({
          numero: 1,
          turnoId: 10,
          usuarioId: 2,
          formaPagamento: 'dinheiro',
          itens: [{ produtoId: 12, quantidade: 2, precoUnitario: 1.5 }],
          total: 99,
        }),
      TotalExternoError,
    );

    const venda = new Venda({
      numero: 1,
      turnoId: 10,
      usuarioId: 2,
      formaPagamento: 'pix',
      itens: [
        { produtoId: 12, quantidade: 3, precoUnitario: 0.75 },
        { produtoId: 15, quantidade: 1, precoUnitario: 2.5 },
      ],
    });
    assert.equal(venda.total, 4.75);
  });

  test('toda venda pertence a um turno_id', () => {
    assert.throws(
      () =>
        new Venda({
          numero: 1,
          turnoId: 0,
          usuarioId: 2,
          formaPagamento: 'dinheiro',
          itens: [{ produtoId: 1, quantidade: 1, precoUnitario: 1 }],
        }),
      TurnoObrigatorioError,
    );
  });

  test('forma de pagamento deve ser da whitelist', () => {
    assert.throws(
      () =>
        new Venda({
          numero: 1,
          turnoId: 10,
          usuarioId: 2,
          formaPagamento: 'cheque',
          itens: [{ produtoId: 1, quantidade: 1, precoUnitario: 1 }],
        }),
      FormaPagamentoInvalidaError,
    );
  });

  test('item calcula subtotal como quantidade × preco_unitario snapshot', () => {
    const item = new VendaItem({ produtoId: 12, quantidade: 3, precoUnitario: 0.75 });
    assert.equal(item.subtotal, 2.25);
  });

  test('cancelar marca status cancelada', () => {
    const venda = new Venda({
      numero: 1024,
      turnoId: 10,
      usuarioId: 2,
      formaPagamento: 'dinheiro',
      itens: [{ produtoId: 12, quantidade: 1, precoUnitario: 5 }],
    });
    venda.cancelar('Item lançado em dobro', 1);
    assert.equal(venda.status, 'cancelada');
    assert.equal(venda.motivoCancelamento, 'Item lançado em dobro');
    assert.equal(venda.canceladoPor, 1);
  });
});

describe('domínio Venda — pagamentos divididos (item 9, docs/depois-do-teste.md)', () => {
  const itensBase = [{ produtoId: 1, quantidade: 1, precoUnitario: 10 }];

  test('duas formas cuja soma bate com o total gera forma_pagamento "misto"', () => {
    const venda = new Venda({
      numero: 1,
      turnoId: 10,
      usuarioId: 2,
      pagamentos: [
        { formaPagamento: 'dinheiro', valor: 6 },
        { formaPagamento: 'cartao', valor: 4 },
      ],
      itens: itensBase,
    });
    assert.equal(venda.formaPagamento, 'misto');
    assert.deepEqual(venda.pagamentos, [
      { formaPagamento: 'dinheiro', valor: 6 },
      { formaPagamento: 'cartao', valor: 4 },
    ]);
  });

  test('soma diferente do total lança PagamentosInvalidosError', () => {
    assert.throws(
      () =>
        new Venda({
          numero: 1,
          turnoId: 10,
          usuarioId: 2,
          pagamentos: [
            { formaPagamento: 'dinheiro', valor: 6 },
            { formaPagamento: 'cartao', valor: 3 },
          ],
          itens: itensBase,
        }),
      PagamentosInvalidosError,
    );
  });

  test('as duas formas não podem ser iguais', () => {
    assert.throws(
      () =>
        new Venda({
          numero: 1,
          turnoId: 10,
          usuarioId: 2,
          pagamentos: [
            { formaPagamento: 'dinheiro', valor: 6 },
            { formaPagamento: 'dinheiro', valor: 4 },
          ],
          itens: itensBase,
        }),
      PagamentosInvalidosError,
    );
  });

  test('mais de duas formas não é aceito', () => {
    assert.throws(
      () =>
        new Venda({
          numero: 1,
          turnoId: 10,
          usuarioId: 2,
          pagamentos: [
            { formaPagamento: 'dinheiro', valor: 4 },
            { formaPagamento: 'cartao', valor: 3 },
            { formaPagamento: 'pix', valor: 3 },
          ],
          itens: itensBase,
        }),
      PagamentosInvalidosError,
    );
  });

  test('valor zero ou negativo numa das formas é inválido', () => {
    assert.throws(
      () =>
        new Venda({
          numero: 1,
          turnoId: 10,
          usuarioId: 2,
          pagamentos: [
            { formaPagamento: 'dinheiro', valor: 10 },
            { formaPagamento: 'cartao', valor: 0 },
          ],
          itens: itensBase,
        }),
      PagamentosInvalidosError,
    );
  });

  test('sem pagamentos, cai no formaPagamento único (compatibilidade)', () => {
    const venda = new Venda({
      numero: 1,
      turnoId: 10,
      usuarioId: 2,
      formaPagamento: 'pix',
      itens: itensBase,
    });
    assert.equal(venda.formaPagamento, 'pix');
    assert.deepEqual(venda.pagamentos, [{ formaPagamento: 'pix', valor: 10 }]);
  });
});
