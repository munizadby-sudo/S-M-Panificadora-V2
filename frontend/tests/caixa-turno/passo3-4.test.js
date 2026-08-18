import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { getTurnoAtual, invalidarCacheTurno, turnoEstaAberto } from '../../src/modules/caixa-turno/estado.js';
import {
  calcularRevisao,
  classificarDiferenca,
  contagemPreenchida,
  criarControleImpressao,
  fecharTurno,
  htmlComprovanteRevisao,
  imprimirHtml,
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

describe('Passo 3 — contagem e revisão', () => {
  test('contagem só fica válida com todos os campos preenchidos', () => {
    assert.equal(contagemPreenchida({ dinheiro: '40', moedas: '10', pix: '0', cartao: '0' }), true);
    assert.equal(contagemPreenchida({ dinheiro: '40', moedas: '', pix: '0', cartao: '0' }), false);
    assert.equal(contagemPreenchida({ dinheiro: '40', moedas: '10', pix: '0' }), false);
  });

  test('calcula diferença provisória a partir do esperado e do contado', () => {
    const revisao = calcularRevisao({
      esperado: { dinheiro: 50, pix: 0, cartao: 0 },
      contado: { dinheiro: 40, moedas: 5, pix: 0, cartao: 0 },
    });
    assert.equal(revisao.contado.dinheiro, 45);
    assert.equal(revisao.diferenca.total, -5);
    assert.equal(revisao.status_resumo, 'falta');
    assert.equal(classificarDiferenca(revisao.status_resumo), 'Falta');
  });

  test('Confirmar e fechar só libera depois de imprimir o comprovante', async () => {
    const controle = criarControleImpressao({ imprimir: async () => {} });
    assert.equal(controle.confirmarHabilitado(), false);
    assert.equal(controle.mostrarProsseguirSemImpressao(), false);

    await controle.imprimirPrevia(
      htmlComprovanteRevisao({
        periodo: 'tarde',
        turno_id: 12,
        esperado: { dinheiro: 50, pix: 0, cartao: 0 },
        contado: { dinheiro: 50, pix: 0, cartao: 0 },
        diferenca: { dinheiro: 0, pix: 0, cartao: 0, total: 0 },
        status_resumo: 'bateu certo',
      }),
    );
    assert.equal(controle.confirmarHabilitado(), true);
    assert.equal(controle.mostrarProsseguirSemImpressao(), false);
    assert.equal(controle.semImpressao(), false);
  });

  test('comprovante imprimível detalha diferença por forma', () => {
    const comprovante = htmlComprovanteRevisao({
      periodo: 'tarde',
      turno_id: 12,
      esperado: { dinheiro: 50, pix: 10, cartao: 20 },
      contado: { dinheiro: 45, pix: 10, cartao: 25 },
      diferenca: { dinheiro: -5, pix: 0, cartao: 5, total: 0 },
      status_resumo: 'bateu certo',
    });
    assert.match(
      comprovante,
      /<h2>Diferença<\/h2>\s*<p>Bateu certo<\/p>\s*<p>Dinheiro: .*?<\/p>\s*<p>Pix: .*?<\/p>\s*<p>Cartão: .*?<\/p>\s*<p>Total: .*?<\/p>/s,
    );
  });

  test('Prosseguir sem impressão só aparece depois de uma tentativa que falha', async () => {
    const controle = criarControleImpressao({
      async imprimir() {
        throw new Error('impressora offline');
      },
    });
    assert.equal(controle.mostrarProsseguirSemImpressao(), false);
    await controle.imprimirPrevia('<p>comprovante</p>');
    assert.equal(controle.confirmarHabilitado(), false);
    assert.equal(controle.mostrarProsseguirSemImpressao(), true);

    assert.equal(controle.seguirSemImpressao(), true);
    assert.equal(controle.confirmarHabilitado(), true);
    assert.equal(controle.semImpressao(), true);
    assert.equal(controle.mostrarProsseguirSemImpressao(), false);
  });
});

describe('Passo 3 — impressão sem about:blank vazio (ISSUE-001)', () => {
  test('imprimirHtml abre janela sem noopener e escreve o HTML', async () => {
    const chamadasOpen = [];
    const docs = [];
    globalThis.open = (url, target, features) => {
      chamadasOpen.push({ url, target, features });
      const doc = {
        open() {
          docs.push('open');
        },
        write(html) {
          docs.push(html);
        },
        close() {
          docs.push('close');
        },
      };
      return {
        document: doc,
        focus() {},
        print() {
          docs.push('print');
        },
      };
    };

    await imprimirHtml('<h1>Comprovante</h1>');

    assert.equal(chamadasOpen.length, 1);
    assert.equal(chamadasOpen[0].url, '');
    assert.equal(chamadasOpen[0].target, '_blank');
    assert.equal(chamadasOpen[0].features, undefined);
    assert.ok(!String(chamadasOpen[0].features || '').includes('noopener'));
    assert.ok(docs.includes('<h1>Comprovante</h1>'));
    assert.ok(docs.includes('print'));
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
