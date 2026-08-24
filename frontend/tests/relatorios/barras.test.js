import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  htmlBarraHorizontal,
  htmlGraficoBarrasVerticais,
} from '../../src/modules/relatorios/barras.js';

describe('barras — escala relativa e vazios seguros', () => {
  test('htmlBarraHorizontal usa percentual relativo a valorMaximo', () => {
    const html = htmlBarraHorizontal({
      rotulo: 'Pix',
      valor: 50,
      valorMaximo: 100,
    });
    assert.match(html, /width: 50%/);
    assert.match(html, /barra-h-preenchimento/);
    assert.match(html, /Pix/);
  });

  test('valorMaximo zero gera 0% sem dividir por zero', () => {
    const html = htmlBarraHorizontal({
      rotulo: 'Pix',
      valor: 10,
      valorMaximo: 0,
    });
    assert.match(html, /width: 0%/);
    assert.doesNotMatch(html, /NaN%/);
    assert.doesNotMatch(html, /-Infinity%/);
    assert.doesNotMatch(html, /Infinity%/);
  });

  test('dois conjuntos diferentes geram percentuais distintos para o mesmo valor absoluto', () => {
    const pontosA = [
      { hora: 8, quantidade: 10 },
      { hora: 9, quantidade: 20 },
    ];
    const pontosB = [
      { hora: 8, quantidade: 10 },
      { hora: 9, quantidade: 40 },
    ];
    const htmlA = htmlGraficoBarrasVerticais({
      pontos: pontosA,
      chaveRotulo: 'hora',
      chaveValor: 'quantidade',
    });
    const htmlB = htmlGraficoBarrasVerticais({
      pontos: pontosB,
      chaveRotulo: 'hora',
      chaveValor: 'quantidade',
    });

    const alturaDoValor10 = (html) => {
      const item = html.split('grafico-v-item').find((parte) => parte.includes('>10<') || /title="10"/.test(parte));
      assert.ok(item, 'barra do valor 10 deve existir');
      const match = item.match(/height: (\d+)%/);
      assert.ok(match);
      return Number(match[1]);
    };

    assert.equal(alturaDoValor10(htmlA), 50);
    assert.equal(alturaDoValor10(htmlB), 25);
    assert.notEqual(alturaDoValor10(htmlA), alturaDoValor10(htmlB));
  });

  test('conjunto vazio não produz NaN% nem -Infinity%', () => {
    const html = htmlGraficoBarrasVerticais({
      pontos: [],
      chaveRotulo: 'hora',
      chaveValor: 'quantidade',
    });
    assert.equal(html, '');
    assert.doesNotMatch(html, /NaN%/);
    assert.doesNotMatch(html, /-Infinity%/);
  });

  test('rótulo vertical usa hora com sufixo h', () => {
    const html = htmlGraficoBarrasVerticais({
      pontos: [{ hora: 8, quantidade: 34 }],
      chaveRotulo: 'hora',
      chaveValor: 'quantidade',
      formatadorRotulo: (hora) => `${hora}h`,
    });
    assert.match(html, /8h/);
    assert.match(html, /height: 100%/);
  });
});
