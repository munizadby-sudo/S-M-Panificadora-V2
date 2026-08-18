export class CaixaTurnoRepository {
  async buscarTurnoAberto() {
    throw new Error('CaixaTurnoRepository.buscarTurnoAberto não implementado');
  }

  async buscarPorId(_id) {
    throw new Error('CaixaTurnoRepository.buscarPorId não implementado');
  }

  async existeParaPeriodo(_data, _periodo) {
    throw new Error('CaixaTurnoRepository.existeParaPeriodo não implementado');
  }

  async salvar(_turno) {
    throw new Error('CaixaTurnoRepository.salvar não implementado');
  }

  async fecharAtomico(_id, _dadosFechamento) {
    throw new Error('CaixaTurnoRepository.fecharAtomico não implementado');
  }
}

export class FluxoCaixaRepository {
  async somarPorFormaETurno(_turnoId, _categorias) {
    throw new Error('FluxoCaixaRepository.somarPorFormaETurno não implementado');
  }

  async agregarEntradasSaidasPorTurno(_turnoId, _categorias) {
    throw new Error('FluxoCaixaRepository.agregarEntradasSaidasPorTurno não implementado');
  }

  async registrar(_lancamento, _conexao) {
    throw new Error('FluxoCaixaRepository.registrar não implementado');
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
