export class PerdaRepository {
  async salvar(_perda, _conexao) {
    throw new Error('PerdaRepository.salvar não implementado');
  }

  async buscarPorId(_id, _conexao) {
    throw new Error('PerdaRepository.buscarPorId não implementado');
  }

  async atualizar(_perda, _conexao) {
    throw new Error('PerdaRepository.atualizar não implementado');
  }

  async listar(_filtros) {
    throw new Error('PerdaRepository.listar não implementado');
  }

  async comTransacao(_fn) {
    throw new Error('PerdaRepository.comTransacao não implementado');
  }
}
