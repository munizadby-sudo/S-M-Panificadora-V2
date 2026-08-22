import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { carregarConfig, ConfigInvalidaError } from '../src/config.js';

describe('carregarConfig', () => {
  test('lança ConfigInvalidaError quando JWT_SECRET está ausente', () => {
    assert.throws(() => carregarConfig({}), ConfigInvalidaError);
    assert.throws(() => carregarConfig({ JWT_SECRET: '' }), ConfigInvalidaError);
  });

  test('aplica defaults quando só JWT_SECRET é informado', () => {
    const config = carregarConfig({ JWT_SECRET: 'segredo' });
    assert.equal(config.jwtSecret, 'segredo');
    assert.equal(config.jwtExpiresIn, '12h');
    assert.equal(config.porta, 3001);
    assert.equal(config.corsOrigin, '*');
  });

  test('lê JWT_EXPIRES, PORTA e CORS_ORIGIN do ambiente quando presentes', () => {
    const config = carregarConfig({
      JWT_SECRET: 'segredo',
      JWT_EXPIRES: '2h',
      PORTA: '4000',
      CORS_ORIGIN: 'https://loja.exemplo.com',
    });
    assert.equal(config.jwtExpiresIn, '2h');
    assert.equal(config.porta, 4000);
    assert.equal(config.corsOrigin, 'https://loja.exemplo.com');
  });

  test('PORT é aceito como fallback de PORTA', () => {
    const config = carregarConfig({ JWT_SECRET: 'segredo', PORT: '5000' });
    assert.equal(config.porta, 5000);
  });

  test('PORTA tem prioridade sobre PORT quando ambos estão presentes', () => {
    const config = carregarConfig({ JWT_SECRET: 'segredo', PORTA: '4000', PORT: '5000' });
    assert.equal(config.porta, 4000);
  });
});
