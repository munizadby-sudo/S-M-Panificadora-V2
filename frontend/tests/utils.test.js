import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { debounce, formatarData, formatarMoeda } from '../src/core/utils.js';

describe('utils', () => {
  test('formatarMoeda usa pt-BR', () => {
    assert.equal(formatarMoeda(1234.5), 'R$ 1.234,50');
    assert.equal(formatarMoeda(0), 'R$ 0,00');
  });

  test('formatarData converte ISO para dd/mm/aaaa', () => {
    assert.equal(formatarData('2026-08-12T08:01:00Z'), '12/08/2026');
  });

  test('debounce só executa a última chamada após o atraso', async () => {
    let chamadas = 0;
    const fn = debounce(() => {
      chamadas += 1;
    }, 40);

    fn();
    fn();
    fn();
    assert.equal(chamadas, 0);
    await delay(80);
    assert.equal(chamadas, 1);
  });
});
