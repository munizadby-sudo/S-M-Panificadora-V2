export class ClienteRepository {
  async listar(_filtros) {
    throw new Error('ClienteRepository.listar não implementado');
  }

  async buscarPorId(_id) {
    throw new Error('ClienteRepository.buscarPorId não implementado');
  }

  async existeTelefoneAtivo(_telefone, _excetoId) {
    throw new Error('ClienteRepository.existeTelefoneAtivo não implementado');
  }

  async salvar(_cliente) {
    throw new Error('ClienteRepository.salvar não implementado');
  }

  async atualizar(_cliente) {
    throw new Error('ClienteRepository.atualizar não implementado');
  }
}
