import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { htmlAvisoCaixaFechado } from '../../src/modules/pdv/aviso.js';
import { criarLancamentoManual } from '../../src/modules/fluxo-caixa/api.js';
import { htmlFormularioLancamento } from '../../src/modules/fluxo-caixa/formulario.js';
import { validarFormularioLancamento } from '../../src/modules/fluxo-caixa/util.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Operador',
    username: 'op',
    role: 'operador',
    permissoes: ['fluxo'],
  });
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

describe('Passo 3 — lançamento manual', () => {
  test('formulário não oferece seleção de turno', () => {
    const html = htmlFormularioLancamento({
      formulario: { tipo: 'saida', descricao: '', categoria: 'sangria', forma: 'dinheiro', valor: '' },
    });
    assert.match(html, /fluxo-tipo/);
    assert.match(html, /fluxo-descricao/);
    assert.match(html, /fluxo-categoria/);
    assert.match(html, /fluxo-forma/);
    assert.match(html, /fluxo-valor/);
    assert.doesNotMatch(html, /select[^>]*turno/i);
    assert.doesNotMatch(html, /name="turno/i);
    assert.match(html, /automaticamente pelo caixa aberto/);
  });

  test('formulário desabilitado reutiliza aviso de caixa fechado do PDV', () => {
    const htmlForm = htmlFormularioLancamento({
      formulario: { tipo: 'saida', descricao: '', categoria: 'sangria', forma: 'dinheiro', valor: '' },
      desabilitado: true,
    });
    const aviso = htmlAvisoCaixaFechado();
    assert.match(htmlForm, /disabled/);
    assert.match(aviso, /Abra o caixa para começar a vender/);
  });

  test('validação exige valor maior que zero e descrição', () => {
    const invalido = validarFormularioLancamento({
      tipo: 'entrada',
      descricao: '  ',
      categoria: 'suprimento',
      forma: 'pix',
      valor: 0,
    });
    assert.equal(invalido.ok, false);
    assert.ok(invalido.erros.descricao);
    assert.ok(invalido.erros.valor);
  });

  test('criarLancamentoManual envia POST /fluxo-caixa sem turno_id', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), body: init.body, method: init.method });
      return jsonOk({ id: 55, turno_id: 12, tipo: 'saida', valor: 25 });
    };

    await criarLancamentoManual({
      tipo: 'saida',
      descricao: 'Compra de sacolas',
      categoria: 'suprimento',
      forma: 'dinheiro',
      valor: 25,
    });

    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/fluxo-caixa$/);
    const corpo = JSON.parse(chamadas[0].body);
    assert.equal(corpo.turno_id, undefined);
    assert.equal(corpo.valor, 25);
  });
});
