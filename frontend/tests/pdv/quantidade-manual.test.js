import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import {
  adicionarAoCarrinho,
  definirQuantidadeNoCarrinho,
  htmlCarrinho,
  totalLocal,
} from '../../src/modules/pdv/carrinho.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pao = { id: 12, nome: 'Pão Francês', preco: 1.5 };
const broa = { id: 15, nome: 'Broa', preco: 2.5 };

describe('Quantidade manual no item (item 8, docs/depois-do-teste.md)', () => {
  test('definirQuantidadeNoCarrinho troca a quantidade direto, sem clicar N vezes', () => {
    let carrinho = adicionarAoCarrinho([], pao);
    carrinho = definirQuantidadeNoCarrinho(carrinho, 12, 12);
    assert.equal(carrinho[0].quantidade, 12);
    assert.equal(carrinho[0].subtotal, 18);
    assert.equal(totalLocal(carrinho), 18);
  });

  test('quantidade zero ou vazia remove o item, igual ao remover último em 1', () => {
    let carrinho = adicionarAoCarrinho([], pao);
    carrinho = adicionarAoCarrinho(carrinho, broa);
    carrinho = definirQuantidadeNoCarrinho(carrinho, 12, 0);
    assert.equal(carrinho.length, 1);
    assert.equal(carrinho[0].produtoId, 15);
  });

  test('quantidade negativa também remove (nunca fica negativa no carrinho)', () => {
    let carrinho = adicionarAoCarrinho([], pao);
    carrinho = definirQuantidadeNoCarrinho(carrinho, 12, -5);
    assert.equal(carrinho.length, 0);
  });

  test('produto que não está no carrinho não faz nada', () => {
    const carrinho = adicionarAoCarrinho([], pao);
    const depois = definirQuantidadeNoCarrinho(carrinho, 999, 5);
    assert.deepEqual(depois, carrinho);
  });

  test('não mexe nos outros itens da lista', () => {
    let carrinho = adicionarAoCarrinho([], pao);
    carrinho = adicionarAoCarrinho(carrinho, broa);
    carrinho = definirQuantidadeNoCarrinho(carrinho, 12, 5);
    assert.equal(carrinho.find((i) => i.produtoId === 15).quantidade, 1);
  });

  test('htmlCarrinho renderiza um input de quantidade por item, com o valor atual', () => {
    let carrinho = adicionarAoCarrinho([], pao);
    carrinho = adicionarAoCarrinho(carrinho, carrinho.length ? pao : pao);
    const html = htmlCarrinho(carrinho);
    assert.match(html, /data-quantidade-item="12"[^>]*value="2"/);
    assert.match(html, /type="number"/);
  });

  test('index.js ouve change no input de quantidade e usa definirQuantidadeNoCarrinho', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'index.js'), 'utf8');
    assert.match(fonte, /data-quantidade-item/);
    assert.match(fonte, /definirQuantidadeNoCarrinho/);
  });
});
