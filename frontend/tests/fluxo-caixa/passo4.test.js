import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { excluirLancamento } from '../../src/modules/fluxo-caixa/api.js';
import { htmlTabelaFluxo } from '../../src/modules/fluxo-caixa/lista.js';
import { htmlModalExclusao, podeExcluirLancamento } from '../../src/modules/fluxo-caixa/modal-exclusao.js';
import { validarMotivoExclusao } from '../../src/modules/fluxo-caixa/util.js';

const manual = {
  id: 10,
  tipo: 'saida',
  descricao: 'Sangria',
  categoria: 'sangria',
  forma: 'dinheiro',
  valor: 15,
  gerado_auto: 0,
  usuario: 'Operador',
};

const automatico = {
  id: 11,
  tipo: 'entrada',
  descricao: 'Venda #2',
  categoria: 'vendas',
  forma: 'pix',
  valor: 8,
  gerado_auto: 1,
  usuario: 'Operador',
};

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
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

describe('Passo 4 — exclusão de lançamento', () => {
  test('operador vê excluir em manual e não vê em automático', () => {
    const htmlOperador = htmlTabelaFluxo([manual, automatico], { ehAdmin: false });
    assert.match(htmlOperador, /data-excluir-fluxo="10"/);
    assert.doesNotMatch(htmlOperador, /data-excluir-fluxo="11"/);
  });

  test('admin vê excluir em manual e automático', () => {
    const htmlAdmin = htmlTabelaFluxo([manual, automatico], { ehAdmin: true });
    assert.match(htmlAdmin, /data-excluir-fluxo="10"/);
    assert.match(htmlAdmin, /data-excluir-fluxo="11"/);
  });

  test('podeExcluirLancamento reflete regra admin vs automático', () => {
    assert.equal(podeExcluirLancamento(manual, false), true);
    assert.equal(podeExcluirLancamento(automatico, false), false);
    assert.equal(podeExcluirLancamento(automatico, true), true);
  });

  test('modal exige motivo obrigatório', () => {
    const html = htmlModalExclusao({ lancamento: manual });
    assert.match(html, /Motivo \(obrigatório\)/);
    assert.match(html, /fluxo-motivo-exclusao/);
    assert.match(html, /Confirmar exclusão/);

    const validacao = validarMotivoExclusao('   ');
    assert.equal(validacao.ok, false);
  });

  test('excluirLancamento envia DELETE com motivo no corpo', async () => {
    salvarSessao('token', {
      id: 1,
      nome: 'Admin',
      username: 'admin',
      role: 'admin',
      permissoes: ['fluxo'],
    });

    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init.method, body: init.body });
      return jsonOk({ mensagem: 'Lançamento excluído.' });
    };

    await excluirLancamento(11, 'Ajuste administrativo');
    assert.equal(chamadas[0].method, 'DELETE');
    assert.match(chamadas[0].url, /\/fluxo-caixa\/11$/);
    assert.deepEqual(JSON.parse(chamadas[0].body), { motivo: 'Ajuste administrativo' });
  });
});
