import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Perda } from '../../src/modules/losses/domain/Perda.js';
import {
  CustoCalculadoExternoError,
  MotivoInvalidoError,
  QuantidadeInvalidaError,
} from '../../src/modules/losses/domain/erros.js';

describe('domínio Perda', () => {
  test('quantidade deve ser maior que zero', () => {
    assert.throws(
      () =>
        new Perda({
          produtoId: 1,
          data: '2026-08-17',
          quantidade: 0,
          motivo: 'queimado',
          produtoCusto: 0.3,
          usuarioId: 1,
        }),
      QuantidadeInvalidaError,
    );
    assert.throws(
      () =>
        new Perda({
          produtoId: 1,
          data: '2026-08-17',
          quantidade: -1,
          motivo: 'queimado',
          produtoCusto: 0.3,
          usuarioId: 1,
        }),
      QuantidadeInvalidaError,
    );
  });

  test('motivo deve pertencer à whitelist — nunca texto livre', () => {
    assert.throws(
      () =>
        new Perda({
          produtoId: 1,
          data: '2026-08-17',
          quantidade: 2,
          motivo: 'estrago',
          produtoCusto: 0.3,
          usuarioId: 1,
        }),
      MotivoInvalidoError,
    );
    const perda = new Perda({
      produtoId: 1,
      data: '2026-08-17',
      quantidade: 2,
      motivo: 'SOBRA',
      produtoCusto: 0.3,
      usuarioId: 1,
    });
    assert.equal(perda.motivo, 'sobra');
  });

  test('custoCalculado é derivado de produto.custo × quantidade e não aceita valor externo', () => {
    assert.throws(
      () =>
        new Perda({
          produtoId: 1,
          data: '2026-08-17',
          quantidade: 5,
          motivo: 'queimado',
          produtoCusto: 0.3,
          usuarioId: 1,
          custoCalculado: 99,
        }),
      CustoCalculadoExternoError,
    );
    const perda = new Perda({
      produtoId: 1,
      data: '2026-08-17',
      quantidade: 5,
      motivo: 'queimado',
      produtoCusto: 0.3,
      usuarioId: 1,
    });
    assert.equal(perda.custoCalculado, 1.5);
  });

  test('estornar marca ativo = false sem remover o registro', () => {
    const perda = new Perda({
      id: 8,
      produtoId: 12,
      data: '2026-08-17',
      quantidade: 5,
      motivo: 'queimado',
      produtoCusto: 0.3,
      usuarioId: 2,
    });
    assert.equal(perda.ativo, true);
    perda.estornar();
    assert.equal(perda.ativo, false);
    assert.equal(perda.id, 8);
  });
});
