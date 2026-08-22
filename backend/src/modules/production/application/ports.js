export class ProducaoRepository {
  async salvar(_producao, _conexao) {
    throw new Error('ProducaoRepository.salvar não implementado');
  }

  async buscarPorId(_id, _conexao) {
    throw new Error('ProducaoRepository.buscarPorId não implementado');
  }

  async listar(_filtros) {
    throw new Error('ProducaoRepository.listar não implementado');
  }

  async comTransacao(_fn) {
    throw new Error('ProducaoRepository.comTransacao não implementado');
  }
}
