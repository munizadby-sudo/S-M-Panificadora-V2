import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { criarProducao, mensagemErroProducao } from '../../src/modules/producao/api.js';
import { htmlFormularioProducao } from '../../src/modules/producao/formulario.js';
import { validarFormularioProducao } from '../../src/modules/producao/validacao.js';
import moduloProducao from '../../src/modules/producao/index.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['producao'],
  });
});

function jsonOk(corpo, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 1 — formulário de lançamento', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloProducao.id, 'producao');
    assert.equal(moduloProducao.label, 'Produção');
    assert.equal(moduloProducao.permissao, 'producao');
    assert.equal(typeof moduloProducao.montar, 'function');
    assert.equal(typeof moduloProducao.desmontar, 'function');
  });

  test('formulário não tem campo de responsável — só produto, quantidade e data', () => {
    const html = htmlFormularioProducao({
      formulario: { buscaProduto: '', produto: null, quantidade: '', data: '2026-08-22' },
      resultadosProduto: [],
    });
    assert.match(html, /producao-quantidade/);
    assert.match(html, /producao-data/);
    assert.doesNotMatch(html, /responsavel/i);
    assert.doesNotMatch(html, /usuario_id/);
  });

  test('criarProducao envia POST /producao', async () => {
    const urls = [];
    const corpos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      corpos.push(JSON.parse(init.body));
      return jsonOk({ id: 5, produto_id: 12, data: '2026-08-22', quantidade: 40, usuario_id: 1 });
    };

    const resposta = await criarProducao({ produto_id: 12, data: '2026-08-22', quantidade: 40 });
    assert.match(urls[0], /\/producao$/);
    assert.equal(corpos[0].produto_id, 12);
    assert.equal(resposta.quantidade, 40);
  });

  test('validarFormularioProducao rejeita quantidade ≤ 0 e produto ausente', () => {
    const semProduto = validarFormularioProducao({ produtoId: null, quantidade: 10, data: '2026-08-22' });
    assert.equal(semProduto.ok, false);
    assert.match(semProduto.erros.produto, /Selecione um produto/);

    const semQuantidade = validarFormularioProducao({ produtoId: 12, quantidade: 0, data: '2026-08-22' });
    assert.equal(semQuantidade.ok, false);
    assert.match(semQuantidade.erros.quantidade, /maior que zero/);
  });

  test('mensagemErroProducao devolve a mensagem do backend', () => {
    const msg = mensagemErroProducao(new ApiError({ status: 404, mensagem: 'Produto não encontrado.' }));
    assert.equal(msg, 'Produto não encontrado.');
  });
});
