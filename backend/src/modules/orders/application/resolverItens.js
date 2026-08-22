import { ProdutoInativoError } from '../../inventory/domain/erros.js';
import { ProdutoNaoEncontradoError } from '../../products/domain/erros.js';

export async function resolverItens(produtoRepository, itens) {
  if (!Array.isArray(itens)) {
    return [];
  }
  const resolvidos = [];
  for (const item of itens) {
    const produtoId = Number(item.produto_id ?? item.produtoId);
    const produto = await produtoRepository.buscarPorId(produtoId);
    if (!produto) {
      throw new ProdutoNaoEncontradoError();
    }
    if (!produto.ativo) {
      throw new ProdutoInativoError();
    }
    resolvidos.push({
      produtoId,
      quantidade: item.quantidade,
      precoUnitario: produto.preco,
    });
  }
  return resolvidos;
}
