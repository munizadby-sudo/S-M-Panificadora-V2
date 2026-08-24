export class FuncionarioRepository {
  async listar(_filtros) {
    throw new Error('FuncionarioRepository.listar não implementado');
  }

  async buscarPorId(_id) {
    throw new Error('FuncionarioRepository.buscarPorId não implementado');
  }

  async salvar(_funcionario) {
    throw new Error('FuncionarioRepository.salvar não implementado');
  }

  async atualizar(_funcionario) {
    throw new Error('FuncionarioRepository.atualizar não implementado');
  }
}

export class AdiantamentoRepository {
  async salvar(_adiantamento) {
    throw new Error('AdiantamentoRepository.salvar não implementado');
  }

  async listar(_filtros) {
    throw new Error('AdiantamentoRepository.listar não implementado');
  }

  async somarPorFuncionarioNoPeriodo(_funcionarioId, _inicio, _fim) {
    throw new Error('AdiantamentoRepository.somarPorFuncionarioNoPeriodo não implementado');
  }
}

export class OcorrenciaFolhaRepository {
  async salvar(_ocorrencia) {
    throw new Error('OcorrenciaFolhaRepository.salvar não implementado');
  }

  async listar(_filtros) {
    throw new Error('OcorrenciaFolhaRepository.listar não implementado');
  }

  async somarPorTipoNoPeriodo(_funcionarioId, _inicio, _fim) {
    throw new Error('OcorrenciaFolhaRepository.somarPorTipoNoPeriodo não implementado');
  }
}

export class FolhaPagamentoRepository {
  async salvar(_folha) {
    throw new Error('FolhaPagamentoRepository.salvar não implementado');
  }

  async atualizar(_folha) {
    throw new Error('FolhaPagamentoRepository.atualizar não implementado');
  }

  async buscarPorId(_id) {
    throw new Error('FolhaPagamentoRepository.buscarPorId não implementado');
  }

  async buscarPorFuncionarioEPeriodo(_funcionarioId, _inicio, _fim) {
    throw new Error('FolhaPagamentoRepository.buscarPorFuncionarioEPeriodo não implementado');
  }

  async listar(_filtros) {
    throw new Error('FolhaPagamentoRepository.listar não implementado');
  }
}
