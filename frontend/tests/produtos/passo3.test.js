import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { atualizarProduto, criarProduto, mensagemErroProduto } from '../../src/modules/produtos/api.js';
import { aplicarErroSalvarProduto, htmlModalProduto } from '../../src/modules/produtos/modal-produto.js';
import { validarProduto } from '../../src/modules/produtos/validacao.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['produtos'],
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

describe('Passo 3 — cadastro e edição de produto', () => {
  test('validarProduto exige nome, categoria e preço maior que zero', () => {
    const vazio = validarProduto({});
    assert.equal(vazio.ok, false);
    assert.match(vazio.erros.nome, /obrigatório/);
    assert.match(vazio.erros.categoria_id, /obrigatória/);
    assert.match(vazio.erros.preco, /maior que zero/);

    const ok = validarProduto({ nome: 'Pão Francês', categoria_id: 3, preco: '0,75', custo: '0,30' });
    assert.equal(ok.ok, true);
    assert.equal(ok.valores.preco, 0.75);
    assert.equal(ok.valores.custo, 0.3);
  });

  test('modal tem nome, categoria, preço, custo e ícone', () => {
    const html = htmlModalProduto({ produto: { nome: 'Pão Francês', preco: 0.75, custo: 0.3, icone: '🥖' } });
    assert.match(html, /Novo produto/);
    assert.match(html, /id="produto-nome"/);
    assert.match(html, /id="produto-categoria"/);
    assert.match(html, /id="produto-preco"/);
    assert.match(html, /id="produto-custo"/);
    assert.match(html, /id="produto-icone"/);
    assert.match(html, /🥖/);
  });

  test('criarProduto e atualizarProduto usam POST e PUT', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method, body: init?.body });
      return jsonOk({ id: 12, nome: 'Pão Francês', categoria_id: 3, preco: 0.75, custo: 0.3, ativo: 1 });
    };

    await criarProduto({ nome: 'Pão Francês', categoria_id: 3, preco: 0.75, custo: 0.3, icone: '🥖' });
    await atualizarProduto(12, { nome: 'Pão Francês', categoria_id: 3, preco: 0.8, custo: 0.3 });

    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/produtos$/);
    assert.equal(chamadas[1].method, 'PUT');
    assert.match(chamadas[1].url, /\/produtos\/12$/);
  });

  test('409 de nome duplicado vira mensagem de negócio e não fecha o modal', () => {
    const erro = new ApiError({
      status: 409,
      mensagem: 'Já existe um produto com este nome nesta categoria.',
    });
    assert.equal(mensagemErroProduto(erro), 'Já existe um produto com esse nome nessa categoria.');

    const modal = aplicarErroSalvarProduto({ aberto: true, produto: { nome: 'Pão Francês' }, erro: '', errosCampos: {} }, erro);
    assert.equal(modal.aberto, true);
    assert.equal(modal.erro, 'Já existe um produto com esse nome nessa categoria.');
    assert.deepEqual(modal.errosCampos, {});
  });

  test('400 de preço inválido aparece no campo e o modal permanece aberto', () => {
    const erro = new ApiError({ status: 400, mensagem: 'Preço deve ser maior que zero.' });
    const modal = aplicarErroSalvarProduto({ aberto: true, produto: {}, erro: '', errosCampos: {} }, erro);
    assert.equal(modal.aberto, true);
    assert.equal(modal.errosCampos.preco, 'Preço deve ser maior que zero.');
    assert.equal(modal.erro, '');
  });
});
