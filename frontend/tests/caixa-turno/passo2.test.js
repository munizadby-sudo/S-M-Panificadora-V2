import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { getTurnoAtual, invalidarCacheTurno, turnoEstaAberto } from '../../src/modules/caixa-turno/estado.js';
import { abrirTurno, mensagemErroAbertura, obterFundoPadrao } from '../../src/modules/caixa-turno/abertura.js';
import { mostrarCorrecoes } from '../../src/modules/caixa-turno/index.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  invalidarCacheTurno();
  salvarSessao('token', { id: 1, nome: 'Admin', username: 'admin', role: 'admin', permissoes: ['caixa'] });
});

afterEach(() => {
  invalidarCacheTurno();
});

function jsonOk(corpo) {
  return {
    status: 200,
    ok: true,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 2 — abertura com fundo pré-preenchido', () => {
  test('lê fundo_troco_* de GET /configuracoes', async () => {
    globalThis.fetch = async (url) => {
      assert.match(String(url), /configuracoes$/);
      return jsonOk({ fundo_troco_especie: 40, fundo_troco_moedas: 10, nome_loja: 'S&M' });
    };
    const fundo = await obterFundoPadrao();
    assert.equal(fundo.fundo_especie, 40);
    assert.equal(fundo.fundo_moedas, 10);
  });

  test('abrirTurno posta no backend, atualiza o cache e devolve correcoes_pendentes', async () => {
    const urls = [];
    globalThis.fetch = async (url, init) => {
      urls.push({ url: String(url), method: init?.method, body: init?.body });
      if (String(url).includes('/abrir')) {
        return jsonOk({
          id: 12,
          status: 'aberto',
          periodo: 'tarde',
          correcoes_pendentes: [
            { id: 3, venda_id: 481, motivo: 'Item lançado em dobro', solicitado_por: 'Isadora' },
          ],
        });
      }
      return jsonOk({
        aberto: true,
        turno: { id: 12, periodo: 'tarde', status: 'aberto' },
      });
    };

    const resposta = await abrirTurno({ fundo_especie: 45, fundo_moedas: 8 });
    assert.equal(resposta.correcoes_pendentes.length, 1);
    assert.equal(turnoEstaAberto(), true);
    assert.ok(urls.some((item) => item.url.includes('/caixa-turno/abrir') && item.method === 'POST'));
    assert.ok(urls.some((item) => item.url.includes('/caixa-turno/status')));
    await getTurnoAtual();
  });

  test('409 de turno já aberto vira mensagem e não quebra o fluxo', () => {
    const erro = new ApiError({ status: 409, mensagem: 'Já existe um turno de caixa aberto.' });
    assert.equal(mensagemErroAbertura(erro), 'Já existe um turno de caixa aberto.');
  });

  test('correcoes_pendentes aparecem como aviso não bloqueante', () => {
    const el = { hidden: true, innerHTML: '' };
    mostrarCorrecoes(el, [{ motivo: 'Item lançado em dobro', venda_id: 481 }]);
    assert.equal(el.hidden, false);
    assert.match(el.innerHTML, /Item lançado em dobro/);
    assert.match(el.innerHTML, /481/);
    mostrarCorrecoes(el, []);
    assert.equal(el.hidden, true);
  });
});
