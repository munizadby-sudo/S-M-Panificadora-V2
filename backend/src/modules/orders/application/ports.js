export class EncomendaRepository {
  async salvar(_encomenda, _conexao) {
    throw new Error('EncomendaRepository.salvar não implementado');
  }

  async buscarPorId(_id, _conexao) {
    throw new Error('EncomendaRepository.buscarPorId não implementado');
  }

  async atualizar(_encomenda, _conexao) {
    throw new Error('EncomendaRepository.atualizar não implementado');
  }

  async substituirItens(_encomendaId, _itens, _conexao) {
    throw new Error('EncomendaRepository.substituirItens não implementado');
  }

  async listar(_filtros) {
    throw new Error('EncomendaRepository.listar não implementado');
  }

  async comTransacao(_fn) {
    throw new Error('EncomendaRepository.comTransacao não implementado');
  }
}
