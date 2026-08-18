import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ObterOuCriarEstoqueDoDia } from '../../src/modules/inventory/application/ObterOuCriarEstoqueDoDia.js';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import { Produto } from '../../src/modules/products/domain/Produto.js';
import { MemoriaEstoqueRepository } from '../helpers/MemoriaEstoqueRepository.js';
import { MemoriaProdutoRepository } from '../helpers/MemoriaProdutoRepository.js';

async function cenario() {
  const produtoRepository = new MemoriaProdutoRepository();
  const estoqueRepository = new MemoriaEstoqueRepository();
  const obterOuCriar = new ObterOuCriarEstoqueDoDia({ estoqueRepository, produtoRepository });
  const produto = await produtoRepository.salvar(
    new Produto({ nome: 'Pão Francês', categoriaId: 1, preco: 1, custo: 0.4 }),
  );
  return { produto, estoqueRepository, obterOuCriar };
}

describe('ObterOuCriarEstoqueDoDia', () => {
  test('produto sem histórico nenhum começa o dia em zero', async () => {
    const { produto, obterOuCriar } = await cenario();
    const estoque = await obterOuCriar.executar({ produtoId: produto.id, data: '2026-08-17' });
    assert.equal(estoque.inicial, 0);
    assert.equal(estoque.produzido, 0);
    assert.equal(estoque.vendido, 0);
    assert.equal(estoque.disponivel(), 0);
    assert.equal(estoque.data, '2026-08-17');
  });

  test('dia sem registro herda o disponível do dia anterior (rollover)', async () => {
    const { produto, estoqueRepository, obterOuCriar } = await cenario();
    await estoqueRepository.salvar(
      new EstoqueDiario({
        produtoId: produto.id,
        data: '2026-08-16',
        inicial: 20,
        produzido: 50,
        vendido: 18,
      }),
    );

    const estoque = await obterOuCriar.executar({ produtoId: produto.id, data: '2026-08-17' });
    assert.equal(estoque.inicial, 52);
    assert.equal(estoque.produzido, 0);
    assert.equal(estoque.vendido, 0);
    assert.equal(estoque.disponivel(), 52);
  });

  test('registro já existente no dia é devolvido sem recriar', async () => {
    const { produto, estoqueRepository, obterOuCriar } = await cenario();
    const salvo = await estoqueRepository.salvar(
      new EstoqueDiario({
        produtoId: produto.id,
        data: '2026-08-17',
        inicial: 10,
        produzido: 3,
        vendido: 1,
      }),
    );

    const estoque = await obterOuCriar.executar({ produtoId: produto.id, data: '2026-08-17' });
    assert.equal(estoque.id, salvo.id);
    assert.equal(estoque.inicial, 10);
    assert.equal(estoque.produzido, 3);
    assert.equal(estoque.vendido, 1);
  });
});
