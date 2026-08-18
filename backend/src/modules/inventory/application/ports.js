export class EstoqueRepository {
  async buscarPorProdutoEData(_produtoId, _data, _conexao) {
    throw new Error('EstoqueRepository.buscarPorProdutoEData não implementado');
  }

  async buscarMaisRecenteAnterior(_produtoId, _data, _conexao) {
    throw new Error('EstoqueRepository.buscarMaisRecenteAnterior não implementado');
  }

  async salvar(_estoque, _conexao) {
    throw new Error('EstoqueRepository.salvar não implementado');
  }

  async atualizar(_estoque, _conexao) {
    throw new Error('EstoqueRepository.atualizar não implementado');
  }

  async bloquearPorProdutoEData(_produtoId, _data, _conexao) {
    throw new Error('EstoqueRepository.bloquearPorProdutoEData não implementado');
  }

  async comTransacao(_fn) {
    throw new Error('EstoqueRepository.comTransacao não implementado');
  }
}
