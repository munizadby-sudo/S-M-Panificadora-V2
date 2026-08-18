import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { atualizarEstoqueEmLote, listarEstoque, produtoIdDoErroLote } from '../../src/modules/estoque/api.js';
import { htmlTabelaEstoque } from '../../src/modules/estoque/lista.js';
import {
  aplicarErroLote,
  atualizarDisponivelPreviaLinha,
  calcularDisponivelPreview,
  htmlTabelaLoteEstoque,
  validarLinhasLote,
} from '../../src/modules/estoque/tabela-lote.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['estoque'],
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

const linhas = [
  { produto_id: 12, nome: 'Pão Francês', inicial: 20, produzido: 50, vendido: 18, disponivel: 52, minimo: 10 },
  { produto_id: 13, nome: 'Broa', inicial: 5, produzido: 30, vendido: 0, disponivel: 35, minimo: null },
  { produto_id: 14, nome: 'Bolo', inicial: 2, produzido: 8, vendido: 1, disponivel: 9, minimo: 3 },
];

describe('Passo 4 — lançamento em lote', () => {
  test('tabela em lote edita inicial/produzido/mínimo e nunca vendido/disponível', () => {
    const html = htmlTabelaLoteEstoque(linhas);
    assert.match(html, /data-lote-inicial="12"/);
    assert.match(html, /data-lote-produzido="13"/);
    assert.match(html, /data-lote-minimo="14"/);
    assert.match(html, /Pão Francês/);
    assert.match(html, /Broa/);
    assert.match(html, /Bolo/);
    assert.doesNotMatch(html, /data-lote-vendido/);
    assert.match(html, /data-lote-disponivel="12"/);
    assert.doesNotMatch(html, /name="vendido"/);
    assert.doesNotMatch(html, /name="disponivel"/);
    assert.doesNotMatch(html, /<input[^>]*disponivel/i);
  });

  test('atualizarEstoqueEmLote envia POST /estoque/lote', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method, body: init?.body });
      return jsonOk({ atualizados: 3 });
    };

    const resposta = await atualizarEstoqueEmLote({
      data: '2026-08-17',
      itens: [
        { produto_id: 12, inicial: 20, produzido: 50 },
        { produto_id: 13, inicial: 5, produzido: 30 },
        { produto_id: 14, inicial: 2, produzido: 8 },
      ],
    });
    assert.equal(resposta.atualizados, 3);
    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/estoque\/lote$/);
  });

  test('item inválido no lote identifica a linha e preserva os demais valores', () => {
    const comNegativo = [
      { ...linhas[0], inicial: '20' },
      { ...linhas[1], inicial: '-1', produzido: '30' },
      { ...linhas[2], inicial: '8' },
    ];
    const validacao = validarLinhasLote(comNegativo);
    assert.equal(validacao.ok, false);
    assert.equal(validacao.produtoIdErro, 13);
    assert.equal(validacao.linhas[0].inicial, '20');
    assert.equal(validacao.linhas[2].inicial, '8');
    assert.match(validacao.linhas[1].erro, /negativo/);

    const html = htmlTabelaLoteEstoque(validacao.linhas);
    assert.match(html, /estoque-linha-lote-erro/);
    assert.match(html, /data-lote-produto="13"/);
    assert.match(html, /value="20"/);
    assert.match(html, /value="8"/);
  });

  test('prévia recalcula disponível com inicial + produzido − vendido enquanto edita', () => {
    assert.equal(calcularDisponivelPreview(100, -50, 0), 50);
    assert.equal(calcularDisponivelPreview(100, 50, 18), 132);

    const celula = {
      _texto: '150',
      set textContent(valor) {
        this._texto = valor;
      },
      get textContent() {
        return this._texto;
      },
    };
    const container = {
      querySelector(seletor) {
        if (seletor.includes('data-lote-inicial="12"')) {
          return { value: '100' };
        }
        if (seletor.includes('data-lote-produzido="12"')) {
          return { value: '-50' };
        }
        if (seletor.includes('data-lote-disponivel="12"')) {
          return celula;
        }
        return null;
      },
    };
    atualizarDisponivelPreviaLinha(container, 12, 0);
    assert.equal(celula.textContent, '50');
  });

  test('lote válido salva 3 produtos e disponível da listagem bate com inicial + produzido − vendido', async () => {
    const estoque = {
      12: { produto_id: 12, nome: 'Pão Francês', vendido: 18, data: '2026-08-17', minimo: 10 },
      13: { produto_id: 13, nome: 'Broa', vendido: 0, data: '2026-08-17', minimo: null },
      14: { produto_id: 14, nome: 'Bolo', vendido: 1, data: '2026-08-17', minimo: 3 },
    };
    const lancamentos = {
      12: { inicial: 20, produzido: 50 },
      13: { inicial: 5, produzido: 30 },
      14: { inicial: 2, produzido: 8 },
    };

    globalThis.fetch = async (url, init) => {
      const destino = String(url);
      if (init?.method === 'POST' && /\/estoque\/lote$/.test(destino)) {
        const corpo = JSON.parse(init.body);
        for (const item of corpo.itens) {
          Object.assign(estoque[item.produto_id], item);
        }
        return jsonOk({ atualizados: corpo.itens.length });
      }
      if (/\/estoque/.test(destino)) {
        const data = Object.values(estoque).map((item) => ({
          ...item,
          disponivel: item.inicial + item.produzido - item.vendido,
          abaixo_do_minimo: false,
        }));
        return jsonOk({
          data,
          pagination: { page: 1, limit: 100, total: data.length, pages: 1, hasPrevious: false, hasNext: false },
        });
      }
      return jsonOk({ data: [] });
    };

    const respostaLote = await atualizarEstoqueEmLote({
      data: '2026-08-17',
      itens: [
        { produto_id: 12, ...lancamentos[12], minimo: 10 },
        { produto_id: 13, ...lancamentos[13], minimo: null },
        { produto_id: 14, ...lancamentos[14], minimo: 3 },
      ],
    });
    assert.equal(respostaLote.atualizados, 3);

    const lista = await listarEstoque();
    assert.equal(lista.data.length, 3);
    for (const item of lista.data) {
      assert.equal(item.disponivel, item.inicial + item.produzido - item.vendido);
    }

    const html = htmlTabelaEstoque(lista.data);
    assert.match(html, /52/);
    assert.match(html, /35/);
    assert.match(html, /9/);
  });

  test('erro do backend aponta o produto_id e não limpa as outras linhas', () => {
    const erro = new ApiError({
      status: 404,
      mensagem: 'Item produto_id=13: Produto não encontrado.',
    });
    assert.equal(produtoIdDoErroLote(erro), 13);

    const marcadas = aplicarErroLote(
      [
        { ...linhas[0], inicial: '99' },
        { ...linhas[1], inicial: '7' },
        { ...linhas[2], inicial: '4' },
      ],
      erro,
    );
    assert.match(marcadas[1].erro, /produto_id=13/);
    assert.equal(marcadas[0].erro, '');
    assert.equal(marcadas[2].erro, '');
    assert.equal(marcadas[0].inicial, '99');
    assert.equal(marcadas[2].inicial, '4');
  });
});
