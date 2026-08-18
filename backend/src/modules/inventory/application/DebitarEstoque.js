import { normalizarData } from '../domain/EstoqueDiario.js';
import { ProdutoInativoError } from '../domain/erros.js';
import { ProdutoNaoEncontradoError } from '../../products/domain/erros.js';

export class DebitarEstoque {
  constructor({ estoqueRepository, produtoRepository, obterOuCriarEstoqueDoDia }) {
    this.estoqueRepository = estoqueRepository;
    this.produtoRepository = produtoRepository;
    this.obterOuCriarEstoqueDoDia = obterOuCriarEstoqueDoDia;
  }

  async executar(conexao, produtoId, data, quantidade) {
    exigirConexao(conexao);
    const id = Number(produtoId);
    const dia = normalizarData(data);
    const produto = await this.produtoRepository.buscarPorId(id);
    if (!produto) {
      throw new ProdutoNaoEncontradoError();
    }
    if (!produto.ativo) {
      throw new ProdutoInativoError();
    }

    const estoque = await this.bloquearOuCriar(conexao, id, dia);
    estoque.debitar(quantidade);
    return this.estoqueRepository.atualizar(estoque, conexao);
  }

  async bloquearOuCriar(conexao, produtoId, data) {
    const bloqueado = await this.estoqueRepository.bloquearPorProdutoEData(produtoId, data, conexao);
    if (bloqueado) {
      return bloqueado;
    }
    await this.obterOuCriarEstoqueDoDia.executar({ produtoId, data, conexao });
    return this.estoqueRepository.bloquearPorProdutoEData(produtoId, data, conexao);
  }
}

export function exigirConexao(conexao) {
  if (!conexao) {
    throw new Error('DebitarEstoque/ReverterDebito exigem a conexão da transação do chamador.');
  }
}
