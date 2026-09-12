import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { validarProduto } from '../../src/modules/produtos/validacao.js';
import { htmlModalProduto } from '../../src/modules/produtos/modal-produto.js';

describe('Produto por peso e código da balança (item 6, docs/depois-do-teste.md)', () => {
  test('validarProduto: padrão é unidade sem exigir código', () => {
    const resultado = validarProduto({ nome: 'Pão Francês', categoria_id: 3, preco: '0,75' });
    assert.equal(resultado.ok, true);
    assert.equal(resultado.valores.tipo_estoque, 'unidade');
    assert.equal(resultado.valores.codigo_balanca, null);
  });

  test('validarProduto: peso exige código de 5 dígitos', () => {
    const semCodigo = validarProduto({
      nome: 'Queijo Mussarela',
      categoria_id: 3,
      preco: '47',
      tipo_estoque: 'peso',
    });
    assert.equal(semCodigo.ok, false);
    assert.match(semCodigo.erros.codigo_balanca, /5 dígitos/);

    const codigoCurto = validarProduto({
      nome: 'Queijo Mussarela',
      categoria_id: 3,
      preco: '47',
      tipo_estoque: 'peso',
      codigo_balanca: '123',
    });
    assert.equal(codigoCurto.ok, false);

    const ok = validarProduto({
      nome: 'Queijo Mussarela',
      categoria_id: 3,
      preco: '47',
      tipo_estoque: 'peso',
      codigo_balanca: '00001',
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.valores.tipo_estoque, 'peso');
    assert.equal(ok.valores.codigo_balanca, '00001');
  });

  test('validarProduto: trocar pra unidade sempre limpa o código, mesmo se veio preenchido', () => {
    const resultado = validarProduto({
      nome: 'Pão Francês',
      categoria_id: 3,
      preco: '0,75',
      tipo_estoque: 'unidade',
      codigo_balanca: '00001',
    });
    assert.equal(resultado.ok, true);
    assert.equal(resultado.valores.codigo_balanca, null);
  });

  test('htmlModalProduto: unidade esconde o campo de código da balança', () => {
    const html = htmlModalProduto({ produto: { nome: 'Pão Francês', preco: 0.75, tipo_estoque: 'unidade' } });
    assert.match(html, /id="produto-codigo-balanca-wrap"[^>]*hidden/);
    assert.match(html, /<option value="unidade" selected>/);
  });

  test('htmlModalProduto: peso mostra o campo de código já preenchido', () => {
    const html = htmlModalProduto({
      produto: { nome: 'Queijo Mussarela', preco: 47, tipo_estoque: 'peso', codigo_balanca: '00001' },
    });
    assert.doesNotMatch(html, /id="produto-codigo-balanca-wrap"[^>]*hidden/);
    assert.match(html, /<option value="peso" selected>/);
    assert.match(html, /id="produto-codigo-balanca"[^>]*value="00001"/);
  });

  test('htmlModalProduto: trocandoTipo mostra o aviso de acertar o saldo na mão', () => {
    const semTroca = htmlModalProduto({ produto: { tipo_estoque: 'unidade' }, trocandoTipo: false });
    assert.match(semTroca, /id="produto-novo-saldo-wrap"[^>]*hidden/);

    const comTroca = htmlModalProduto({ produto: { tipo_estoque: 'peso' }, trocandoTipo: true });
    assert.doesNotMatch(comTroca, /id="produto-novo-saldo-wrap"[^>]*hidden/);
    assert.match(comTroca, /acerte na mão/);
  });

  test('htmlModalProduto: guarda o tipo original no form pra saber se está trocando', () => {
    const html = htmlModalProduto({ produto: { id: 9, tipo_estoque: 'peso' } });
    assert.match(html, /data-tipo-estoque-original="peso"/);
  });
});
