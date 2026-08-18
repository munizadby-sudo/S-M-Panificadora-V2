import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import {
  EstoqueInsuficienteError,
  QuantidadeInvalidaError,
} from '../../src/modules/inventory/domain/erros.js';

describe('domínio EstoqueDiario', () => {
  test('disponivel é inicial + produzido − vendido', () => {
    const estoque = new EstoqueDiario({
      produtoId: 12,
      data: '2026-08-17',
      inicial: 20,
      produzido: 50,
      vendido: 18,
      minimo: 10,
    });
    assert.equal(estoque.disponivel(), 52);
    assert.equal(estoque.abaixoDoMinimo(), false);
  });

  test('abaixoDoMinimo é só alerta: minimo nulo nunca alerta, abaixo alerta sem bloquear a entidade', () => {
    const semMinimo = new EstoqueDiario({ produtoId: 1, data: '2026-08-17', inicial: 1 });
    assert.equal(semMinimo.abaixoDoMinimo(), false);

    const abaixo = new EstoqueDiario({
      produtoId: 1,
      data: '2026-08-17',
      inicial: 5,
      minimo: 10,
    });
    assert.equal(abaixo.disponivel(), 5);
    assert.equal(abaixo.abaixoDoMinimo(), true);
  });

  test('inicial, produzido e vendido não podem ser negativos', () => {
    assert.throws(
      () => new EstoqueDiario({ produtoId: 1, data: '2026-08-17', inicial: -0.001 }),
      QuantidadeInvalidaError,
    );
    assert.throws(
      () => new EstoqueDiario({ produtoId: 1, data: '2026-08-17', produzido: -1 }),
      QuantidadeInvalidaError,
    );
    assert.throws(
      () => new EstoqueDiario({ produtoId: 1, data: '2026-08-17', vendido: -1 }),
      QuantidadeInvalidaError,
    );
    assert.throws(
      () => new EstoqueDiario({ produtoId: 1, data: '2026-08-17', minimo: -1 }),
      QuantidadeInvalidaError,
    );
  });

  test('vendido não pode exceder inicial + produzido (disponivel nunca negativo)', () => {
    assert.throws(
      () =>
        new EstoqueDiario({
          produtoId: 1,
          data: '2026-08-17',
          inicial: 10,
          produzido: 0,
          vendido: 10.001,
        }),
      EstoqueInsuficienteError,
    );
  });

  test('debitar e reverterDebito respeitam o disponível', () => {
    const estoque = new EstoqueDiario({
      produtoId: 1,
      data: '2026-08-17',
      inicial: 10,
      produzido: 5,
    });
    estoque.debitar(12);
    assert.equal(estoque.vendido, 12);
    assert.equal(estoque.disponivel(), 3);
    assert.throws(() => estoque.debitar(4), EstoqueInsuficienteError);
    estoque.reverterDebito(2);
    assert.equal(estoque.vendido, 10);
    assert.equal(estoque.disponivel(), 5);
  });
});
