import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { htmlConfirmacaoVenda } from '../../src/modules/pdv/confirmacao.js';
import { htmlCarrinho, limparCarrinho, totalLocal } from '../../src/modules/pdv/carrinho.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
});

describe('Passo 4 — confirmação de sucesso e limpeza do carrinho', () => {
  test('exibe número, total do backend e forma — nunca o total local anterior', () => {
    const html = htmlConfirmacaoVenda({
      id: 481,
      numero: 1024,
      total: 12.75,
      forma_pagamento: 'dinheiro',
      status: 'confirmada',
    });
    assert.match(html, /Venda confirmada/);
    assert.match(html, /pdv-venda-numero/);
    assert.match(html, />1024</);
    assert.match(html, /pdv-venda-total/);
    assert.match(html, /R\$ 12,75/);
    assert.match(html, /Dinheiro/);
    assert.doesNotMatch(html, /99,00/);
  });

  test('depois de confirmar o carrinho volta vazio, pronto para a próxima venda', () => {
    const vazio = limparCarrinho();
    assert.equal(totalLocal(vazio), 0);
    const html = htmlCarrinho(vazio);
    assert.match(html, /Carrinho vazio/);
    assert.doesNotMatch(html, /data-remover-item/);
  });
});
