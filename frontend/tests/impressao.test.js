import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { imprimirHtmlEmIframe } from '../src/core/impressao.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('impressão sem aba do Chrome', () => {
  test('cupom e fechamento usam iframe oculto, não window.open', () => {
    const cupom = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'cupom.js'), 'utf8');
    const fechamento = readFileSync(join(frontend, 'src', 'modules', 'caixa-turno', 'fechamento.js'), 'utf8');
    const nucleo = readFileSync(join(frontend, 'src', 'core', 'impressao.js'), 'utf8');
    assert.match(cupom, /imprimirHtmlEmIframe/);
    assert.match(fechamento, /imprimirHtmlEmIframe/);
    assert.match(nucleo, /iframe/);
    assert.doesNotMatch(nucleo, /window\.open|_blank/);
    assert.doesNotMatch(cupom, /window\.open|_blank/);
    assert.doesNotMatch(fechamento, /window\.open|_blank/);
  });

  test('escreve o HTML, chama print e remove o iframe', async () => {
    const passos = [];
    const iframeListeners = {};
    const iframe = {
      style: { cssText: '' },
      parentNode: null,
      setAttribute() {},
      contentDocument: {
        open() {
          passos.push('open');
        },
        write(html) {
          passos.push(html);
        },
        close() {
          passos.push('close');
        },
      },
    };
    iframe.contentWindow = {
      document: iframe.contentDocument,
      focus() {
        passos.push('focus');
      },
      print() {
        passos.push('print');
        (iframeListeners.afterprint || []).forEach((fn) => fn());
      },
      addEventListener(evento, fn) {
        iframeListeners[evento] = iframeListeners[evento] || [];
        iframeListeners[evento].push(fn);
      },
      removeEventListener(evento, fn) {
        iframeListeners[evento] = (iframeListeners[evento] || []).filter((item) => item !== fn);
      },
    };
    const corpo = {
      appendChild(el) {
        el.parentNode = corpo;
        passos.push('append');
      },
      removeChild() {
        iframe.parentNode = null;
        passos.push('remove');
      },
    };

    await imprimirHtmlEmIframe('<p>cupom</p>', {
      body: corpo,
      createElement(tag) {
        assert.equal(tag, 'iframe');
        return iframe;
      },
    });

    assert.deepEqual(passos, ['append', 'open', '<p>cupom</p>', 'close', 'focus', 'print', 'remove']);
    assert.equal(iframe.parentNode, null);
  });
});
