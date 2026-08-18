export class VendaRepository {
  async salvar(_venda, _conexao) {
    throw new Error('VendaRepository.salvar não implementado');
  }

  async buscarPorId(_id, _conexao) {
    throw new Error('VendaRepository.buscarPorId não implementado');
  }

  async buscarItensPorVendaId(_vendaId, _conexao) {
    throw new Error('VendaRepository.buscarItensPorVendaId não implementado');
  }

  async atualizar(_venda, _conexao) {
    throw new Error('VendaRepository.atualizar não implementado');
  }

  async listar(_filtros) {
    throw new Error('VendaRepository.listar não implementado');
  }

  async comTransacao(_fn) {
    throw new Error('VendaRepository.comTransacao não implementado');
  }
}

export class SequenciaRepository {
  async proximoNumero(_chave, _conexao) {
    throw new Error('SequenciaRepository.proximoNumero não implementado');
  }
}

export class CorrecaoPendenteRepository {
  async listarPendentes() {
    return [];
  }

  async criar(_correcao, _conexao) {
    throw new Error('CorrecaoPendenteRepository.criar não implementado');
  }

  async buscarPorId(_id, _conexao) {
    throw new Error('CorrecaoPendenteRepository.buscarPorId não implementado');
  }

  async marcarResolvida(_id, _resolvidoPor, _conexao) {
    throw new Error('CorrecaoPendenteRepository.marcarResolvida não implementado');
  }
}
