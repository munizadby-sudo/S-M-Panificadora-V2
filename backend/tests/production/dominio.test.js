import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Producao } from '../../src/modules/production/domain/Producao.js';
import { QuantidadeInvalidaError } from '../../src/modules/inventory/domain/erros.js';

describe('domínio Producao', () => {
  test('quantidade deve ser maior que zero', () => {
    assert.throws(
      () =>
        new Producao({
          produtoId: 1,
          data: '2026-08-22',
          quantidade: 0,
          usuarioId: 1,
        }),
      QuantidadeInvalidaError,
    );
    assert.throws(
      () =>
        new Producao({
          produtoId: 1,
          data: '2026-08-22',
          quantidade: -5,
          usuarioId: 1,
        }),
      QuantidadeInvalidaError,
    );
  });

  test('produtoId é obrigatório', () => {
    assert.throws(
      () =>
        new Producao({
          produtoId: 0,
          data: '2026-08-22',
          quantidade: 10,
          usuarioId: 1,
        }),
      QuantidadeInvalidaError,
    );
  });

  test('usuarioId (executor) é obrigatório', () => {
    assert.throws(
      () =>
        new Producao({
          produtoId: 1,
          data: '2026-08-22',
          quantidade: 10,
          usuarioId: null,
        }),
      QuantidadeInvalidaError,
    );
  });

  test('paraPublico e paraListagem expõem os campos esperados', () => {
    const producao = new Producao({
      id: 5,
      produtoId: 12,
      data: '2026-08-22',
      quantidade: 40,
      usuarioId: 3,
    });

    assert.deepEqual(producao.paraPublico(), {
      id: 5,
      produto_id: 12,
      data: '2026-08-22',
      quantidade: 40,
      usuario_id: 3,
    });

    assert.deepEqual(producao.paraListagem({ produtoNome: 'Pão Francês', usuarioNome: 'Isadora' }), {
      id: 5,
      produto: 'Pão Francês',
      data: '2026-08-22',
      quantidade: 40,
      usuario: 'Isadora',
    });
  });
});
