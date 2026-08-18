import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { obterResumoFluxo } from '../../src/modules/fluxo-caixa/api.js';
import {
  extrairLiquidoPorForma,
  htmlResumoKPIs,
} from '../../src/modules/fluxo-caixa/resumo.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
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

const resumo = {
  entradas: { dinheiro: 54, pix: 20, cartao: 0 },
  saidas: { dinheiro: 5, pix: 0, cartao: 0 },
};

describe('Passo 2 — KPIs consolidados', () => {
  test('obterResumoFluxo consome GET /fluxo-caixa/resumo', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk(resumo);
    };

    const resposta = await obterResumoFluxo(7);
    assert.equal(resposta.entradas.dinheiro, 54);
    assert.match(urls[0], /\/fluxo-caixa\/resumo/);
    assert.match(urls[0], /turno_id=7/);
  });

  test('htmlResumoKPIs exibe entradas, saídas e líquido por forma', () => {
    const html = htmlResumoKPIs(resumo);
    assert.match(html, /Entradas/);
    assert.match(html, /Saídas/);
    assert.match(html, /Líquido/);
    assert.match(html, /Dinheiro/);
    assert.match(html, /Pix/);
    assert.match(html, /fluxo-kpis/);
  });

  test('KPI reflete entradas de vendas e lançamento manual no mesmo turno', () => {
    const resumoComManual = {
      entradas: { dinheiro: 29, pix: 2, cartao: 0 },
      saidas: { dinheiro: 0, pix: 0, cartao: 0 },
    };

    const html = htmlResumoKPIs(resumoComManual);
    assert.match(html, /29,00/);

    const liquido = extrairLiquidoPorForma(resumoComManual);
    assert.equal(liquido.dinheiro, 29);
    assert.equal(liquido.pix, 2);
    assert.notEqual(liquido.dinheiro, 4, 'não limita às vendas quando há suprimento manual');
  });
});
