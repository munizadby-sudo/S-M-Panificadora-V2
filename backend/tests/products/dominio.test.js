import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Categoria } from '../../src/modules/products/domain/Categoria.js';
import { Produto } from '../../src/modules/products/domain/Produto.js';
import {
  CodigoBalancaInvalidoError,
  CustoInvalidoError,
  NomeInvalidoError,
  PrecoInvalidoError,
  TipoEstoqueInvalidoError,
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
      tipo_estoque: 'unidade',
      codigo_balanca: null,
    });
  });
});

describe('domínio Produto — tipo de estoque e código da balança (item 6, docs/depois-do-teste.md)', () => {
  const base = { nome: 'Queijo Mussarela', categoriaId: 1, preco: 47, custo: 30 };

  test('padrão é unidade, sem código de balança', () => {
    const produto = new Produto(base);
    assert.equal(produto.tipoEstoque, 'unidade');
    assert.equal(produto.codigoBalanca, null);
  });

  test('produto por peso exige código de balança com 5 dígitos', () => {
    assert.throws(
      () => new Produto({ ...base, tipoEstoque: 'peso' }),
      CodigoBalancaInvalidoError,
    );
    assert.throws(
      () => new Produto({ ...base, tipoEstoque: 'peso', codigoBalanca: '123' }),
      CodigoBalancaInvalidoError,
    );
    assert.throws(
      () => new Produto({ ...base, tipoEstoque: 'peso', codigoBalanca: 'abcde' }),
      CodigoBalancaInvalidoError,
    );

    const produto = new Produto({ ...base, tipoEstoque: 'peso', codigoBalanca: '00001' });
    assert.equal(produto.tipoEstoque, 'peso');
    assert.equal(produto.codigoBalanca, '00001');
  });

  test('produto por unidade não pode ter código de balança', () => {
    assert.throws(
      () => new Produto({ ...base, tipoEstoque: 'unidade', codigoBalanca: '00001' }),
      CodigoBalancaInvalidoError,
    );
  });

  test('tipo de estoque fora da whitelist é rejeitado', () => {
    assert.throws(() => new Produto({ ...base, tipoEstoque: 'litro' }), TipoEstoqueInvalidoError);
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

  test('aplicarSchemaProdutos garante tipo_estoque e codigo_balanca (item 6)', async () => {
    const ddl = [];
    const pool = {
      async query(sql) {
        ddl.push(String(sql));
        return [[], []];
      },
    };
    await aplicarSchemaProdutos(pool);
    assert.ok(ddl.some((sql) => /tipo_estoque ENUM\('unidade','peso'\)/i.test(sql)));
    assert.ok(ddl.some((sql) => /produtos_codigo_balanca_unique/i.test(sql)));
  });
});
