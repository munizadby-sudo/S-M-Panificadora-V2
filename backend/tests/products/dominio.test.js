import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Categoria } from '../../src/modules/products/domain/Categoria.js';
import { Produto } from '../../src/modules/products/domain/Produto.js';
import {
  CustoInvalidoError,
  NomeInvalidoError,
  PrecoInvalidoError,
} from '../../src/modules/products/domain/erros.js';
import { aplicarSchemaProdutos } from '../../src/infrastructure/database/db.js';

describe('domínio Categoria', () => {
  test('rejeita nome vazio ou só espaços', () => {
    assert.throws(() => new Categoria({ nome: '   ' }), NomeInvalidoError);
    assert.throws(() => new Categoria({ nome: '' }), NomeInvalidoError);
  });

  test('normaliza nome e permite desativar e reativar', () => {
    const categoria = new Categoria({ nome: '  Pães  ' });
    assert.equal(categoria.nome, 'Pães');
    assert.equal(categoria.ativo, true);
    categoria.desativar();
    assert.equal(categoria.ativo, false);
    categoria.reativar();
    assert.equal(categoria.ativo, true);
  });
});

describe('domínio Produto', () => {
  test('exige nome, preço > 0 e custo ≥ 0', () => {
    assert.throws(() => new Produto({ nome: ' ', categoriaId: 1, preco: 1, custo: 0 }), NomeInvalidoError);
    assert.throws(() => new Produto({ nome: 'Pão', categoriaId: 1, preco: 0, custo: 0 }), PrecoInvalidoError);
    assert.throws(() => new Produto({ nome: 'Pão', categoriaId: 1, preco: -1, custo: 0 }), PrecoInvalidoError);
    assert.throws(() => new Produto({ nome: 'Pão', categoriaId: 1, preco: 1, custo: -0.01 }), CustoInvalidoError);
  });

  test('aceita custo zero e monta payload público', () => {
    const produto = new Produto({
      id: 12,
      nome: '  Pão Francês ',
      categoriaId: 3,
      icone: '🥖',
      preco: 0.75,
      custo: 0,
    });
    assert.equal(produto.nome, 'Pão Francês');
    assert.equal(produto.preco, 0.75);
    assert.equal(produto.custo, 0);
    assert.deepEqual(produto.paraPublico(), {
      id: 12,
      nome: 'Pão Francês',
      categoria_id: 3,
      icone: '🥖',
      preco: 0.75,
      custo: 0,
      ativo: 1,
    });
  });
});

describe('schema produtos e categorias', () => {
  test('aplicarSchemaProdutos cria unicidade de nome por categoria, inclusive inativos', async () => {
    const ddl = [];
    const pool = {
      async query(sql) {
        ddl.push(String(sql));
        return [[], []];
      },
    };
    await aplicarSchemaProdutos(pool);
    assert.ok(ddl.some((sql) => /CREATE TABLE IF NOT EXISTS categorias/i.test(sql)));
    assert.ok(ddl.some((sql) => /CREATE TABLE IF NOT EXISTS produtos/i.test(sql)));
    assert.ok(ddl.some((sql) => /nome_unico_ativo/i.test(sql)));
    assert.ok(ddl.some((sql) => /categorias_nome_unique/i.test(sql)));
    assert.ok(ddl.some((sql) => /produtos_categoria_nome_unique/i.test(sql)));
  });
});
