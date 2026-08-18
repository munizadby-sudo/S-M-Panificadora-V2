import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Venda, VendaItem } from '../../src/modules/sales/domain/Venda.js';
import {
  CarrinhoVazioError,
  FormaPagamentoInvalidaError,
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
