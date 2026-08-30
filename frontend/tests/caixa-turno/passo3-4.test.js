import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { getTurnoAtual, invalidarCacheTurno, turnoEstaAberto } from '../../src/modules/caixa-turno/estado.js';
import {
  calcularRevisao,
  classificarDiferenca,
  completarCabecalhoComprovante,
  contagemPreenchida,
  criarControleImpressao,
  dataUriLogoCupom,
  fecharTurno,
  formatarDiferencaCupom,
  formatarPeriodoTurno,
  formatarRotuloTurno,
  htmlComprovanteRevisao,
  htmlLinhaValor,
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

  test('comprovante térmico 80mm detalha diferença por forma sem cor', () => {
    const comprovante = htmlComprovanteRevisao({
      periodo: 'tarde',
      turno_id: 12,
      data: '26/08/2026',
      hora: '16:05',
      operador: 'Maria',
      esperado: { dinheiro: 50, pix: 10, cartao: 20 },
      contado: { dinheiro: 45, pix: 10, cartao: 25 },
      diferenca: { dinheiro: -5, pix: 0, cartao: 5, total: 0 },
      status_resumo: 'bateu certo',
    });
    assert.match(comprovante, /Comprovante de Fechamento de Caixa/);
    assert.match(comprovante, /CUPOM NÃO FISCAL/);
    assert.match(comprovante, /Documento interno de controle/);
    assert.match(comprovante, /80mm/);
    assert.match(comprovante, /72mm/);
    assert.match(comprovante, /Tarde — Nº 12/);
    assert.match(comprovante, /Operador\(a\) responsável/);
    assert.match(comprovante, /Maria/);
    assert.match(comprovante, /<h2>Esperado<\/h2>/);
    assert.match(comprovante, /<h2>Contado<\/h2>/);
    assert.match(comprovante, /<h2>Diferença<\/h2>/);
    assert.match(comprovante, /\(falta\)/);
    assert.match(comprovante, /\(sobra\)/);
    assert.match(comprovante, /Assinatura do operador/);
    assert.match(comprovante, /Souza &amp; Moraes/);
    assert.match(comprovante, /data:image\/png;base64,/);
    assert.match(comprovante, /alt="S&amp;M Panificadora"/);
    assert.doesNotMatch(comprovante, /src="\/assets\//);
    assert.doesNotMatch(comprovante, /color-mix|rgb\(|linear-gradient/i);
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

describe('SPEC-FE-017 — comprovante térmico (passos 1–4)', () => {
  test('formata período, rótulo do turno e linha de valor', () => {
    assert.equal(formatarPeriodoTurno('manha'), 'Manhã');
    assert.equal(formatarPeriodoTurno('tarde'), 'Tarde');
    assert.equal(formatarRotuloTurno({ periodo: 'tarde', turno_id: 11 }), 'Tarde — Nº 11');
    assert.match(htmlLinhaValor('Pix', 'R$ 10,00'), /<td>Pix<\/td><td class="v">R\$ 10,00<\/td>/);
  });

  test('diferença monocromática usa sinal e texto, nunca só o número', () => {
    assert.match(formatarDiferencaCupom(3), /\+/);
    assert.match(formatarDiferencaCupom(3), /sobra/);
    assert.match(formatarDiferencaCupom(-5.5), /-/);
    assert.match(formatarDiferencaCupom(-5.5), /falta/);
    assert.equal(formatarDiferencaCupom(0).includes('sobra'), false);
    assert.equal(formatarDiferencaCupom(0).includes('falta'), false);
    assert.match(formatarDiferencaCupom(0), /0,00/);
  });

  test('logo do cupom vai como data URI PNG, não como arquivo relativo', () => {
    assert.match(dataUriLogoCupom(), /^data:image\/png;base64,/);
  });

  test('cabecalho da impressão usa o operador da sessão e a hora do clique', () => {
    const preenchido = completarCabecalhoComprovante(
      { periodo: 'tarde', turno_id: 11, esperado: {}, contado: {}, diferenca: {} },
      {
        agora: new Date('2026-08-26T19:05:00-03:00'),
        usuario: { nome: 'Maria Silva' },
        turno: { data: '2026-08-26', id: 11, periodo: 'tarde' },
      },
    );
    assert.equal(preenchido.operador, 'Maria Silva');
    assert.equal(preenchido.data, '26/08/2026');
    assert.match(preenchido.hora, /\d{2}:\d{2}/);

    const html = htmlComprovanteRevisao(preenchido);
    assert.match(html, /Maria Silva/);
    assert.match(html, /Operador\(a\) responsável/);
    assert.match(html, /CUPOM NÃO FISCAL/);
  });
});

describe('Passo 3 — impressão sem about:blank vazio (ISSUE-001)', () => {
  test('imprimirHtml escreve no iframe oculto e dispara print', async () => {
    const docs = [];
    const iframeListeners = {};
    const iframe = {
      style: { cssText: '' },
      parentNode: null,
      setAttribute() {},
      contentDocument: {
        open() {
          docs.push('open');
        },
        write(html) {
          docs.push(html);
        },
        close() {
          docs.push('close');
        },
      },
    };
    iframe.contentWindow = {
      document: iframe.contentDocument,
      focus() {},
      print() {
        docs.push('print');
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
        docs.push('append');
      },
      removeChild(el) {
        el.parentNode = null;
        docs.push('remove');
      },
    };
    globalThis.document = {
      body: corpo,
      createElement(tag) {
        assert.equal(tag, 'iframe');
        return iframe;
      },
    };

    await imprimirHtml('<h1>Comprovante</h1>');

    assert.ok(docs.includes('open'));
    assert.ok(docs.includes('<h1>Comprovante</h1>'));
    assert.ok(docs.includes('print'));
    assert.ok(docs.includes('remove'));
    assert.equal(iframe.parentNode, null);
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
