import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Categoria } from '../../src/modules/products/domain/Categoria.js';
import { Produto } from '../../src/modules/products/domain/Produto.js';
import { MySQLCategoriaRepository } from '../../src/modules/products/infrastructure/MySQLCategoriaRepository.js';
import { MySQLProdutoRepository } from '../../src/modules/products/infrastructure/MySQLProdutoRepository.js';
import { DebitarEstoque } from '../../src/modules/inventory/application/DebitarEstoque.js';
import { ObterOuCriarEstoqueDoDia } from '../../src/modules/inventory/application/ObterOuCriarEstoqueDoDia.js';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import { EstoqueInsuficienteError } from '../../src/modules/inventory/domain/erros.js';
import { MySQLEstoqueRepository } from '../../src/modules/inventory/infrastructure/MySQLEstoqueRepository.js';
import {
  aplicarSchemaEstoque,
  aplicarSchemaProdutos,
} from '../../src/infrastructure/database/db.js';
import { criarPoolTeste, garantirDatabaseTeste, mysqlEstaDisponivel } from '../helpers/mysql.js';

const mysqlPronto = await mysqlEstaDisponivel();

describe('concorrência DebitarEstoque — SELECT FOR UPDATE', { skip: !mysqlPronto }, () => {
  let pool;
  let debitarEstoque;
  let estoqueRepository;
  let produtoRepository;
  let categoriaRepository;

  before(async () => {
    await garantirDatabaseTeste();
    pool = criarPoolTeste();
    await aplicarSchemaProdutos(pool);
    await aplicarSchemaEstoque(pool);

    categoriaRepository = new MySQLCategoriaRepository(pool);
    produtoRepository = new MySQLProdutoRepository(pool);
    estoqueRepository = new MySQLEstoqueRepository(pool);
    const obterOuCriarEstoqueDoDia = new ObterOuCriarEstoqueDoDia({
      estoqueRepository,
      produtoRepository,
    });
    debitarEstoque = new DebitarEstoque({
      estoqueRepository,
      produtoRepository,
      obterOuCriarEstoqueDoDia,
    });
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  test('duas chamadas simultâneas além do disponível: só uma tem sucesso', async () => {
    const categoria = await categoriaRepository.salvar(
      new Categoria({ nome: `Cat Estoque ${Date.now()}.${Math.random().toString(16).slice(2)}` }),
    );
    const produto = await produtoRepository.salvar(
      new Produto({
        nome: `Pão Concorrente ${Date.now()}`,
        categoriaId: categoria.id,
        preco: 1.5,
        custo: 0.5,
      }),
    );
    const data = '2026-08-17';
    await estoqueRepository.salvar(
      new EstoqueDiario({
        produtoId: produto.id,
        data,
        inicial: 10,
        produzido: 0,
        vendido: 0,
      }),
    );

    const [r1, r2] = await Promise.all([
      debitarEmTransacao(pool, debitarEstoque, produto.id, data, 10),
      debitarEmTransacao(pool, debitarEstoque, produto.id, data, 10),
    ]);
    const resultados = [r1, r2];
    const sucessos = resultados.filter((item) => item.ok);
    const falhas = resultados.filter((item) => !item.ok);

    assert.equal(sucessos.length, 1, `esperado 1 sucesso, veio ${JSON.stringify(resumos(resultados))}`);
    assert.equal(falhas.length, 1, `esperado 1 falha, veio ${JSON.stringify(resumos(resultados))}`);
    assert.equal(falhas[0].erro?.name, 'EstoqueInsuficienteError');
    assert.ok(falhas[0].erro instanceof EstoqueInsuficienteError);

    const final = await estoqueRepository.buscarPorProdutoEData(produto.id, data);
    assert.equal(final.vendido, 10);
    assert.equal(final.disponivel(), 0);
  });
});

async function debitarEmTransacao(pool, debitarEstoque, produtoId, data, quantidade) {
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const conexao = await pool.getConnection();
    await conexao.beginTransaction();
    try {
      const resultado = await debitarEstoque.executar(conexao, produtoId, data, quantidade);
      await conexao.commit();
      return { ok: true, resultado };
    } catch (erro) {
      await conexao.rollback();
      if (Number(erro?.errno) === 1213 && tentativa < 2) {
        continue;
      }
      return { ok: false, erro };
    } finally {
      conexao.release();
    }
  }
  return { ok: false, erro: new Error('esgotou tentativas de transação') };
}

function resumos(resultados) {
  return resultados.map((item) => ({
    ok: item.ok,
    erro: item.erro?.name || item.erro?.message,
  }));
}
