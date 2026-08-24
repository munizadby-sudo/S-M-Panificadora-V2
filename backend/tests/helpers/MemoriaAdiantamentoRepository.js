import { Adiantamento } from '../../src/modules/employees/domain/Adiantamento.js';
import { AdiantamentoRepository } from '../../src/modules/employees/application/ports.js';

export class MemoriaAdiantamentoRepository extends AdiantamentoRepository {
  constructor({ funcionarioRepository } = {}) {
    super();
    this.itens = [];
    this.proximoId = 1;
    this.funcionarioRepository = funcionarioRepository;
  }

  async salvar(adiantamento) {
    const salvo = new Adiantamento({
      ...adiantamento,
      id: this.proximoId,
      criadoEm: new Date().toISOString(),
    });
    this.proximoId += 1;
    const comNome = await this.comNome(salvo);
    this.itens.push(comNome);
    return comNome;
  }

  async listar({ funcionarioId, dataInicio, dataFim, page = 1, limit = 20 } = {}) {
    let filtrados = [...this.itens];
    if (funcionarioId !== undefined) {
      filtrados = filtrados.filter((item) => item.funcionarioId === Number(funcionarioId));
    }
    if (dataInicio) {
      filtrados = filtrados.filter((item) => item.data >= dataInicio);
    }
    if (dataFim) {
      filtrados = filtrados.filter((item) => item.data <= dataFim);
    }
    filtrados.sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
    const total = filtrados.length;
    const inicio = (page - 1) * limit;
    return { data: filtrados.slice(inicio, inicio + limit), total };
  }

  async somarPorFuncionarioNoPeriodo(funcionarioId, inicio, fim) {
    return this.itens
      .filter(
        (item) =>
          item.funcionarioId === Number(funcionarioId) &&
          item.data >= inicio &&
          item.data <= fim,
      )
      .reduce((acc, item) => acc + Number(item.valor), 0);
  }

  async comNome(adiantamento) {
    if (!this.funcionarioRepository) {
      return adiantamento;
    }
    const funcionario = await this.funcionarioRepository.buscarPorId(adiantamento.funcionarioId);
    adiantamento.funcionarioNome = funcionario?.nome ?? null;
    return adiantamento;
  }
}
