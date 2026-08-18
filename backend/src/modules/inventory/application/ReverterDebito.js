import { normalizarData } from '../domain/EstoqueDiario.js';
import { exigirConexao } from './DebitarEstoque.js';

export class ReverterDebito {
  constructor({ estoqueRepository, obterOuCriarEstoqueDoDia }) {
    this.estoqueRepository = estoqueRepository;
    this.obterOuCriarEstoqueDoDia = obterOuCriarEstoqueDoDia;
  }

  async executar(conexao, produtoId, data, quantidade) {
    exigirConexao(conexao);
    const id = Number(produtoId);
    const dia = normalizarData(data);

    let estoque = await this.estoqueRepository.bloquearPorProdutoEData(id, dia, conexao);
    if (!estoque) {
      await this.obterOuCriarEstoqueDoDia.executar({ produtoId: id, data: dia, conexao });
      estoque = await this.estoqueRepository.bloquearPorProdutoEData(id, dia, conexao);
    }

    estoque.reverterDebito(quantidade);
    return this.estoqueRepository.atualizar(estoque, conexao);
  }
}
