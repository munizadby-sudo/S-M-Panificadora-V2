import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DebitarEstoque } from '../../src/modules/inventory/application/DebitarEstoque.js';
import { ObterOuCriarEstoqueDoDia } from '../../src/modules/inventory/application/ObterOuCriarEstoqueDoDia.js';
import { ReverterDebito } from '../../src/modules/inventory/application/ReverterDebito.js';
import { dataHoje } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import {
  EstoqueInsuficienteError,
  ProdutoInativoError,
} from '../../src/modules/inventory/domain/erros.js';
import { Produto } from '../../src/modules/products/domain/Produto.js';
import { MemoriaEstoqueRepository } from '../helpers/MemoriaEstoqueRepository.js';
import { MemoriaProdutoRepository } from '../helpers/MemoriaProdutoRepository.js';

const CONEXAO = {};

async function cenario({ inicial = 10, produzido = 0, vendido = 0, minimo = null, ativo = true } = {}) {
  const produtoRepository = new MemoriaProdutoRepository();
  const estoqueRepository = new MemoriaEstoqueRepository();
  const obterOuCriarEstoqueDoDia = new ObterOuCriarEstoqueDoDia({
    estoqueRepository,
    produtoRepository,
  });
  const debitarEstoque = new DebitarEstoque({
    estoqueRepository,
    produtoRepository,
    obterOuCriarEstoqueDoDia,
  });
  const reverterDebito = new ReverterDebito({ estoqueRepository, obterOuCriarEstoqueDoDia });
  const produto = await produtoRepository.salvar(
    new Produto({
      nome: 'Pão Francês',
      categoriaId: 1,
      preco: 1,
      custo: 0.4,
      ativo,
    }),
  );
  await estoqueRepository.salvar(
    new EstoqueDiario({
      produtoId: produto.id,
      data: '2026-08-17',
      inicial,
      produzido,
      vendido,
      minimo,
    }),
  );
  return { produto, estoqueRepository, debitarEstoque, reverterDebito };
}

describe('DebitarEstoque e ReverterDebito', () => {
  test('debita o disponível e recusa quantidade acima do saldo', async () => {
    const { produto, estoqueRepository, debitarEstoque } = await cenario({ inicial: 10, minimo: 20 });
    await debitarEstoque.executar(CONEXAO, produto.id, '2026-08-17', 7);
    const depois = await estoqueRepository.buscarPorProdutoEData(produto.id, '2026-08-17');
    assert.equal(depois.vendido, 7);
    assert.equal(depois.disponivel(), 3);
    await assert.rejects(
      () => debitarEstoque.executar(CONEXAO, produto.id, '2026-08-17', 4),
      EstoqueInsuficienteError,
    );
  });

  test('minimo abaixo do saldo não impede o débito', async () => {
    const { produto, debitarEstoque, estoqueRepository } = await cenario({
      inicial: 5,
      minimo: 10,
    });
    await debitarEstoque.executar(CONEXAO, produto.id, '2026-08-17', 3);
    const depois = await estoqueRepository.buscarPorProdutoEData(produto.id, '2026-08-17');
    assert.equal(depois.disponivel(), 2);
    assert.equal(depois.abaixoDoMinimo(), true);
  });

  test('não debita produto inativo', async () => {
    const { produto, debitarEstoque } = await cenario({ ativo: false });
    await assert.rejects(
      () => debitarEstoque.executar(CONEXAO, produto.id, '2026-08-17', 1),
      ProdutoInativoError,
    );
  });

  test('ReverterDebito usa a data original da operação, nunca a data de hoje', async () => {
    const produtoRepository = new MemoriaProdutoRepository();
    const estoqueRepository = new MemoriaEstoqueRepository();
    const obterOuCriarEstoqueDoDia = new ObterOuCriarEstoqueDoDia({
      estoqueRepository,
      produtoRepository,
    });
    const reverterDebito = new ReverterDebito({ estoqueRepository, obterOuCriarEstoqueDoDia });
    const produto = await produtoRepository.salvar(
      new Produto({ nome: 'Broa', categoriaId: 1, preco: 2, custo: 0.8 }),
    );
    const dataOriginal = '2026-01-15';
    await estoqueRepository.salvar(
      new EstoqueDiario({
        produtoId: produto.id,
        data: dataOriginal,
        inicial: 10,
        vendido: 5,
      }),
    );

    await reverterDebito.executar(CONEXAO, produto.id, dataOriginal, 2);

    const original = await estoqueRepository.buscarPorProdutoEData(produto.id, dataOriginal);
    assert.equal(original.vendido, 3);
    assert.equal(original.disponivel(), 7);
    assert.equal(await estoqueRepository.buscarPorProdutoEData(produto.id, dataHoje()), null);
    assert.notEqual(dataOriginal, dataHoje());
  });
});
