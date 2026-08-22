import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { IncrementarProduzido } from '../../src/modules/inventory/application/IncrementarProduzido.js';
import { ObterOuCriarEstoqueDoDia } from '../../src/modules/inventory/application/ObterOuCriarEstoqueDoDia.js';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import { ProdutoInativoError } from '../../src/modules/inventory/domain/erros.js';
import { Produto } from '../../src/modules/products/domain/Produto.js';
import { MemoriaEstoqueRepository } from '../helpers/MemoriaEstoqueRepository.js';
import { MemoriaProdutoRepository } from '../helpers/MemoriaProdutoRepository.js';

const CONEXAO = {};

async function cenario({ inicial = 10, produzido = 0, vendido = 0, ativo = true } = {}) {
  const produtoRepository = new MemoriaProdutoRepository();
  const estoqueRepository = new MemoriaEstoqueRepository();
  const obterOuCriarEstoqueDoDia = new ObterOuCriarEstoqueDoDia({
    estoqueRepository,
    produtoRepository,
  });
  const incrementarProduzido = new IncrementarProduzido({
    estoqueRepository,
    produtoRepository,
    obterOuCriarEstoqueDoDia,
  });
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
      data: '2026-08-22',
      inicial,
      produzido,
      vendido,
    }),
  );
  return { produto, estoqueRepository, incrementarProduzido };
}

describe('IncrementarProduzido', () => {
  test('incrementa produzido e aumenta o disponível', async () => {
    const { produto, estoqueRepository, incrementarProduzido } = await cenario({ inicial: 5 });
    await incrementarProduzido.executar(CONEXAO, produto.id, '2026-08-22', 40);
    const depois = await estoqueRepository.buscarPorProdutoEData(produto.id, '2026-08-22');
    assert.equal(depois.produzido, 40);
    assert.equal(depois.disponivel(), 45);
  });

  test('dois lançamentos no mesmo dia somam, nunca sobrescrevem', async () => {
    const { produto, estoqueRepository, incrementarProduzido } = await cenario({ inicial: 0 });
    await incrementarProduzido.executar(CONEXAO, produto.id, '2026-08-22', 20);
    await incrementarProduzido.executar(CONEXAO, produto.id, '2026-08-22', 15);
    const depois = await estoqueRepository.buscarPorProdutoEData(produto.id, '2026-08-22');
    assert.equal(depois.produzido, 35);
  });

  test('nunca é bloqueado por saldo, mesmo com estoque zerado', async () => {
    const { produto, estoqueRepository, incrementarProduzido } = await cenario({ inicial: 0 });
    await incrementarProduzido.executar(CONEXAO, produto.id, '2026-08-22', 100);
    const depois = await estoqueRepository.buscarPorProdutoEData(produto.id, '2026-08-22');
    assert.equal(depois.disponivel(), 100);
  });

  test('não incrementa produto inativo', async () => {
    const { produto, incrementarProduzido } = await cenario({ ativo: false });
    await assert.rejects(
      () => incrementarProduzido.executar(CONEXAO, produto.id, '2026-08-22', 10),
      ProdutoInativoError,
    );
  });

  test('cria o registro do dia via rollover quando ainda não existe', async () => {
    const produtoRepository = new MemoriaProdutoRepository();
    const estoqueRepository = new MemoriaEstoqueRepository();
    const obterOuCriarEstoqueDoDia = new ObterOuCriarEstoqueDoDia({
      estoqueRepository,
      produtoRepository,
    });
    const incrementarProduzido = new IncrementarProduzido({
      estoqueRepository,
      produtoRepository,
      obterOuCriarEstoqueDoDia,
    });
    const produto = await produtoRepository.salvar(
      new Produto({ nome: 'Broa', categoriaId: 1, preco: 2, custo: 0.8 }),
    );
    await estoqueRepository.salvar(
      new EstoqueDiario({ produtoId: produto.id, data: '2026-08-21', inicial: 3 }),
    );

    await incrementarProduzido.executar(CONEXAO, produto.id, '2026-08-22', 10);

    const novo = await estoqueRepository.buscarPorProdutoEData(produto.id, '2026-08-22');
    assert.equal(novo.inicial, 3);
    assert.equal(novo.produzido, 10);
    assert.equal(novo.disponivel(), 13);
  });
});
