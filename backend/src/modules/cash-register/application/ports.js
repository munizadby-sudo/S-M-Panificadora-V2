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
}

export class CorrecaoPendenteRepository {
  async listarPendentes() {
    return [];
  }
}
