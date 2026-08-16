import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import {
  getTurnoAtual,
  invalidarCacheTurno,
  onMudancaDeTurno,
  turnoEstaAberto,
} from '../../src/modules/caixa-turno/estado.js';
import { montarBanner, textoDoBanner } from '../../src/modules/caixa-turno/banner.js';
import moduloCaixa from '../../src/modules/caixa-turno/index.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const indexHtml = readFileSync(join(frontend, 'index.html'), 'utf8');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  invalidarCacheTurno();
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['caixa'],
  });
});

afterEach(() => {
  invalidarCacheTurno();
});

describe('Passo 1 — estado e banner de caixa', () => {
  test('getTurnoAtual consome GET /caixa-turno/status e cacheia', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return {
        status: 200,
        ok: true,
        async text() {
          return JSON.stringify({ aberto: false, turno: null });
        },
      };
    };

    const primeiro = await getTurnoAtual();
    const segundo = await getTurnoAtual();
    assert.equal(primeiro.aberto, false);
    assert.equal(turnoEstaAberto(), false);
    assert.equal(urls.length, 1);
    assert.match(urls[0], /caixa-turno\/status/);
    assert.equal(segundo.aberto, false);

    let notificado = null;
    const cancelar = onMudancaDeTurno((status) => {
      notificado = status;
    });
    globalThis.fetch = async () => ({
      status: 200,
      ok: true,
      async text() {
        return JSON.stringify({
          aberto: true,
          turno: { id: 1, periodo: 'tarde', status: 'aberto' },
        });
      },
    });
    await getTurnoAtual({ forcar: true });
    assert.equal(turnoEstaAberto(), true);
    assert.equal(notificado.aberto, true);
    cancelar();
  });

  test('banner mostra Caixa fechado e Caixa aberto com período', async () => {
    assert.equal(textoDoBanner({ aberto: false, turno: null }), 'Caixa fechado');
    assert.equal(
      textoDoBanner({ aberto: true, turno: { periodo: 'manha' } }),
      'Caixa aberto — manhã',
    );

    globalThis.fetch = async () => ({
      status: 200,
      ok: true,
      async text() {
        return JSON.stringify({ aberto: false, turno: null });
      },
    });
    const el = { textContent: '', dataset: {} };
    await montarBanner(el);
    assert.equal(el.textContent, 'Caixa fechado');
    assert.equal(el.dataset.aberto, 'false');
  });

  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloCaixa.id, 'caixa-turno');
    assert.equal(moduloCaixa.label, 'Caixa');
    assert.equal(moduloCaixa.icone, 'ti-cash-banknote');
    assert.equal(moduloCaixa.permissao, 'caixa');
    assert.equal(typeof moduloCaixa.montar, 'function');
    assert.equal(typeof moduloCaixa.desmontar, 'function');
  });

  test('nenhum outro módulo chama GET caixa-turno/status direto', () => {
    const raiz = join(frontend, 'src');
    const arquivos = readdirSync(raiz, { recursive: true })
      .filter((entrada) => extname(entrada) === '.js')
      .map((entrada) => join(raiz, entrada));

    for (const arquivo of arquivos) {
      if (arquivo.endsWith(`${join('caixa-turno', 'estado.js')}`)) {
        continue;
      }
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(
        fonte,
        /caixa-turno\/status/,
        `${arquivo} não pode consultar status direto`,
      );
    }
  });

  test('index.html monta o banner no shell e registra o módulo', () => {
    assert.match(indexHtml, /id="caixa-turno-banner"/);
    assert.match(indexHtml, /modules\/caixa-turno/);
    assert.match(indexHtml, /montarBanner/);
    assert.match(indexHtml, /registrarModulo/);
  });
});
