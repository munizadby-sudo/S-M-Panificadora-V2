import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import {
  adicionarAoCarrinho,
  htmlCarrinho,
  limparCarrinho,
  removerDoCarrinho,
  removerUltimoDoCarrinho,
  totalLocal,
} from '../../src/modules/pdv/carrinho.js';
import { htmlGradeProdutos } from '../../src/modules/pdv/grade.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
});

const pao = { id: 12, nome: 'Pão Francês', preco: 1.5 };
const broa = { id: 15, nome: 'Broa', preco: 2.5 };

describe('Passo 2 — grade de produtos e carrinho local', () => {
  test('grade lista produtos ativos com busca e filtro de categoria', () => {
    const html = htmlGradeProdutos({
      produtos: [pao, broa],
      busca: 'pão',
    });
    assert.match(html, /pdv-grade/);
    assert.match(html, /pdv-busca/);
    assert.match(html, /pdv-categoria/);
    assert.match(html, /Pão Francês/);
    assert.match(html, /Broa/);
    assert.match(html, /data-adicionar-produto="12"/);
  });

  test('total local soma os subtotais só para exibição', () => {
    let carrinho = [];
    carrinho = adicionarAoCarrinho(carrinho, pao);
    carrinho = adicionarAoCarrinho(carrinho, pao);
    carrinho = adicionarAoCarrinho(carrinho, broa);

    assert.equal(carrinho[0].quantidade, 2);
    assert.equal(carrinho[0].subtotal, 3);
    assert.equal(totalLocal(carrinho), 5.5);

    const html = htmlCarrinho(carrinho);
    assert.match(html, /Pão Francês × 2/);
    assert.match(html, /Total: R\$ 5,50/);
  });

  test('remover item e remover último recalculam o total', () => {
    let carrinho = adicionarAoCarrinho([], pao);
    carrinho = adicionarAoCarrinho(carrinho, pao);
    carrinho = adicionarAoCarrinho(carrinho, broa);
    assert.equal(totalLocal(carrinho), 5.5);

    carrinho = removerUltimoDoCarrinho(carrinho);
    assert.equal(totalLocal(carrinho), 3);

    carrinho = removerDoCarrinho(carrinho, 12);
    assert.equal(totalLocal(carrinho), 0);
    assert.equal(carrinho.length, 0);
  });

  test('limpar esvazia o carrinho', () => {
    let carrinho = adicionarAoCarrinho([], pao);
    carrinho = limparCarrinho();
    assert.deepEqual(carrinho, []);
    assert.match(htmlCarrinho(carrinho), /Carrinho vazio/);
  });
});
