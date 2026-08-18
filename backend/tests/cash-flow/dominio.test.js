import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LancamentoFluxoCaixa } from '../../src/modules/cash-flow/domain/LancamentoFluxoCaixa.js';
import {
  TipoInvalidoError,
  TurnoObrigatorioError,
  ValorInvalidoError,
} from '../../src/modules/cash-flow/domain/erros.js';

describe('domínio LancamentoFluxoCaixa', () => {
  test('rejeita valor ≤ 0', () => {
    assert.throws(
      () =>
        new LancamentoFluxoCaixa({
          usuarioId: 1,
          turnoId: 1,
          tipo: 'entrada',
          descricao: 'Suprimento',
          categoria: 'suprimento',
          forma: 'dinheiro',
          valor: 0,
          data: '2026-08-17',
        }),
      ValorInvalidoError,
    );
    assert.throws(
      () =>
        new LancamentoFluxoCaixa({
          usuarioId: 1,
          turnoId: 1,
          tipo: 'saida',
          descricao: 'Sangria',
          categoria: 'sangria',
          forma: 'dinheiro',
          valor: -5,
          data: '2026-08-17',
        }),
      ValorInvalidoError,
    );
  });

  test('rejeita tipo inválido', () => {
    assert.throws(
      () =>
        new LancamentoFluxoCaixa({
          usuarioId: 1,
          turnoId: 1,
          tipo: 'ajuste',
          descricao: 'X',
          categoria: 'suprimento',
          forma: 'dinheiro',
          valor: 10,
          data: '2026-08-17',
        }),
      TipoInvalidoError,
    );
  });

  test('exige turno_id', () => {
    assert.throws(
      () =>
        new LancamentoFluxoCaixa({
          usuarioId: 1,
          turnoId: 0,
          tipo: 'entrada',
          descricao: 'Suprimento',
          categoria: 'suprimento',
          forma: 'dinheiro',
          valor: 10,
          data: '2026-08-17',
        }),
      TurnoObrigatorioError,
    );
  });

  test('aceita lançamento manual válido e monta payload de criação', () => {
    const lancamento = new LancamentoFluxoCaixa({
      id: 55,
      usuarioId: 2,
      turnoId: 12,
      tipo: 'saida',
      descricao: 'Compra de sacolas',
      categoria: 'suprimento',
      forma: 'dinheiro',
      valor: 25,
      data: '2026-08-17',
      geradoAuto: false,
    });

    assert.equal(lancamento.valor, 25);
    assert.equal(lancamento.tipo, 'saida');
    assert.equal(lancamento.geradoAuto, false);
    assert.deepEqual(lancamento.paraCriacao(), {
      id: 55,
      turno_id: 12,
      tipo: 'saida',
      valor: 25,
    });
  });

  test('reconstituir preserva campos persistidos', () => {
    const lancamento = LancamentoFluxoCaixa.reconstituir({
      id: 1,
      usuarioId: 1,
      turnoId: 3,
      tipo: 'entrada',
      descricao: 'Venda #1',
      categoria: 'vendas',
      forma: 'pix',
      valor: 15.5,
      data: '2026-08-17',
      geradoAuto: true,
      vendaId: 9,
      ativo: 1,
    });

    assert.equal(lancamento.geradoAuto, true);
    assert.equal(lancamento.vendaId, 9);
    assert.equal(lancamento.ativo, true);
  });

  test('reconstituir aceita data vinda do MySQL como Date', () => {
    const lancamento = LancamentoFluxoCaixa.reconstituir({
      id: 2,
      usuarioId: 1,
      turnoId: 3,
      tipo: 'entrada',
      descricao: 'Venda #2',
      categoria: 'vendas',
      forma: 'pix',
      valor: 10,
      data: new Date('2026-08-17T12:00:00.000Z'),
      geradoAuto: true,
      ativo: 1,
    });

    assert.equal(lancamento.data, '2026-08-17');
  });
});
