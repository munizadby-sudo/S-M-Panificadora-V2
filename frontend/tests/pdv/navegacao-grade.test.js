import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  aplicarRovingTabindex,
  contarColunasVisiveis,
  indiceAposSeta,
} from '../../src/modules/pdv/navegacao-grade.js';
import { htmlGradeProdutos } from '../../src/modules/pdv/grade.js';

describe('PDV — navegação por teclado na grade (SPEC-FE-015)', () => {
  test('grade usa roving tabindex e atalhos colapsáveis', () => {
    const html = htmlGradeProdutos({
      produtos: [
        { id: 1, nome: 'Pão', preco: 1 },
        { id: 2, nome: 'Broa', preco: 2 },
      ],
    });
    assert.match(html, /tabindex="0"/);
    assert.match(html, /tabindex="-1"/);
    assert.match(html, /<details class="pdv-atalhos">/);
    assert.match(html, /Ver atalhos/);
    assert.match(html, /data-adicionar-produto/);
  });

  test('setas movem o índice dentro dos limites', () => {
    assert.equal(indiceAposSeta(0, 'ArrowRight', 6, 3), 1);
    assert.equal(indiceAposSeta(1, 'ArrowLeft', 6, 3), 0);
    assert.equal(indiceAposSeta(0, 'ArrowDown', 6, 3), 3);
    assert.equal(indiceAposSeta(4, 'ArrowUp', 6, 3), 1);
    assert.equal(indiceAposSeta(5, 'ArrowRight', 6, 3), 5);
  });

  test('roving tabindex marca um único card com tabindex 0', () => {
    const cards = [0, 1, 2].map((i) => ({
      tabIndex: -1,
      classList: { toggle() {} },
      offsetTop: i < 2 ? 0 : 40,
    }));
    const foco = aplicarRovingTabindex(cards, 1);
    assert.equal(foco, 1);
    assert.equal(cards[0].tabIndex, -1);
    assert.equal(cards[1].tabIndex, 0);
    assert.equal(cards[2].tabIndex, -1);
    assert.equal(
      contarColunasVisiveis({
        children: cards,
        querySelectorAll: () => cards,
      }),
      2,
    );
  });
});
