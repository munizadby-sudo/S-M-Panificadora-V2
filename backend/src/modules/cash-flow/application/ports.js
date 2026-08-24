export class LancamentoFluxoCaixaRepository {
  async salvar(_lancamento) {
    throw new Error('LancamentoFluxoCaixaRepository.salvar não implementado');
  }

  async buscarPorId(_id) {
    throw new Error('LancamentoFluxoCaixaRepository.buscarPorId não implementado');
  }

  async listar(_filtros) {
    throw new Error('LancamentoFluxoCaixaRepository.listar não implementado');
  }

  async marcarExcluido(_lancamento) {
    throw new Error('LancamentoFluxoCaixaRepository.marcarExcluido não implementado');
  }

  async listarAtivosNoPeriodo(_dataInicio, _dataFim) {
    throw new Error('LancamentoFluxoCaixaRepository.listarAtivosNoPeriodo não implementado');
  }
}
