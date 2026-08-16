import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { getTurnoAtual, invalidarCacheTurno, turnoEstaAberto } from '../../src/modules/caixa-turno/estado.js';
import {
  classificarDiferenca,
  criarControleImpressao,
  fecharTurno,
  htmlPreviaImprimivel,
} from '../../src/modules/caixa-turno/fechamento.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  invalidarCacheTurno();
  salvarSessao('token', { id: 1, nome: 'Admin', username: 'admin', role: 'admin', permissoes: ['caixa'] });
});

afterEach(() => {
  invalidarCacheTurno();
});

describe('Passo 3 — impressão obrigatória na prévia', () => {
  test('Confirmar fechamento só libera depois de imprimir a prévia', async () => {
    const controle = criarControleImpressao({ imprimir: async () => {} });
    assert.equal(controle.confirmarHabilitado(), false);
    assert.equal(controle.mostrarProsseguirSemImpressao(), false);

    await controle.imprimirPrevia(htmlPreviaImprimivel({ periodo: 'tarde', turno_id: 12, esperado: { dinheiro: 50, pix: 0, cartao: 0 } }));
    assert.equal(controle.confirmarHabilitado(), true);
    assert.equal(controle.mostrarProsseguirSemImpressao(), false);
    assert.equal(controle.semImpressao(), false);
  });

  test('Prosseguir sem impressão só aparece depois de uma tentativa que falha', async () => {
    const controle = criarControleImpressao({
      async imprimir() {
        throw new Error('impressora offline');
      },
    });
    assert.equal(controle.mostrarProsseguirSemImpressao(), false);
    await controle.imprimirPrevia('<p>previa</p>');
    assert.equal(controle.confirmarHabilitado(), false);
    assert.equal(controle.mostrarProsseguirSemImpressao(), true);

    assert.equal(controle.seguirSemImpressao(), true);
    assert.equal(controle.confirmarHabilitado(), true);
    assert.equal(controle.semImpressao(), true);
    assert.equal(controle.mostrarProsseguirSemImpressao(), false);
  });
});

describe('Passo 4 — confirmação e resumo', () => {
  test('fecha o turno com sem_impressao e classifica a diferença', async () => {
    const corpos = [];
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/fechar')) {
        corpos.push(JSON.parse(init.body));
        return {
          status: 200,
          ok: true,
          async text() {
            return JSON.stringify({
              id: 12,
              periodo: 'tarde',
              esperado: { dinheiro: 50, pix: 0, cartao: 0 },
              contado: { dinheiro: 45, pix: 0, cartao: 0 },
              diferenca: { dinheiro: -5, pix: 0, cartao: 0, total: -5 },
              status_resumo: 'falta',
              idempotente: false,
            });
          },
        };
      }
      if (String(url).includes('/status') && corpos.length === 0) {
        return {
          status: 200,
          ok: true,
          async text() {
            return JSON.stringify({
              aberto: true,
              turno: { id: 12, periodo: 'tarde', status: 'aberto' },
            });
          },
        };
      }
      return {
        status: 200,
        ok: true,
        async text() {
          return JSON.stringify({ aberto: false, turno: null });
        },
      };
    };

    await getTurnoAtual({ forcar: true });
    const resumo = await fecharTurno({
      contado_dinheiro: 40,
      contado_moedas: 5,
      contado_pix: 0,
      contado_cartao: 0,
      observacao: 'faltou troco',
      sem_impressao: true,
    });
    assert.equal(corpos[0].turno_id, 12);
    assert.equal(corpos[0].sem_impressao, true);
    assert.equal(resumo.status_resumo, 'falta');
    assert.equal(resumo.idempotente, false);
    assert.equal(classificarDiferenca(resumo.status_resumo), 'Falta');
    assert.equal(classificarDiferenca('sobra'), 'Sobra');
    assert.equal(classificarDiferenca('bateu certo'), 'Bateu certo');
    assert.equal(turnoEstaAberto(), false);
  });

  test('trata idempotente true como sucesso e reenvia o mesmo turno_id', async () => {
    const corpos = [];
    let fechamentos = 0;
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/fechar')) {
        corpos.push(JSON.parse(init.body));
        fechamentos += 1;
        return {
          status: 200,
          ok: true,
          async text() {
            return JSON.stringify({
              id: 12,
              periodo: 'tarde',
              esperado: { dinheiro: 50, pix: 0, cartao: 0 },
              contado: { dinheiro: 50, pix: 0, cartao: 0 },
              diferenca: { dinheiro: 0, pix: 0, cartao: 0, total: 0 },
              status_resumo: 'bateu certo',
              idempotente: fechamentos > 1,
            });
          },
        };
      }
      if (String(url).includes('/status') && fechamentos === 0) {
        return {
          status: 200,
          ok: true,
          async text() {
            return JSON.stringify({
              aberto: true,
              turno: { id: 12, periodo: 'tarde', status: 'aberto' },
            });
          },
        };
      }
      return {
        status: 200,
        ok: true,
        async text() {
          return JSON.stringify({ aberto: false, turno: null });
        },
      };
    };

    await getTurnoAtual({ forcar: true });
    const primeiro = await fecharTurno({
      turno_id: 12,
      contado_dinheiro: 40,
      contado_moedas: 10,
      contado_pix: 0,
      contado_cartao: 0,
      observacao: '',
      sem_impressao: true,
    });
    const segundo = await fecharTurno({
      turno_id: 12,
      contado_dinheiro: 40,
      contado_moedas: 10,
      contado_pix: 0,
      contado_cartao: 0,
      observacao: '',
      sem_impressao: true,
    });

    assert.equal(corpos[0].turno_id, 12);
    assert.equal(corpos[1].turno_id, 12);
    assert.equal(primeiro.idempotente, false);
    assert.equal(segundo.idempotente, true);
    assert.equal(segundo.status_resumo, 'bateu certo');
  });
});
