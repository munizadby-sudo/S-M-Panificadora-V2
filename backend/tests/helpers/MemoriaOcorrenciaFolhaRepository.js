import { OcorrenciaFolha } from '../../src/modules/employees/domain/OcorrenciaFolha.js';
import { OcorrenciaFolhaRepository } from '../../src/modules/employees/application/ports.js';

export class MemoriaOcorrenciaFolhaRepository extends OcorrenciaFolhaRepository {
  constructor({ funcionarioRepository } = {}) {
    super();
    this.itens = [];
    this.proximoId = 1;
    this.funcionarioRepository = funcionarioRepository;
  }

  async salvar(ocorrencia) {
    const salva = new OcorrenciaFolha({
      ...ocorrencia,
      id: this.proximoId,
      criadoEm: new Date().toISOString(),
    });
    this.proximoId += 1;
    const comNome = await this.comNome(salva);
    this.itens.push(comNome);
    return comNome;
  }

  async listar({ funcionarioId, tipo, dataInicio, dataFim, page = 1, limit = 20 } = {}) {
    let filtrados = [...this.itens];
    if (funcionarioId !== undefined) {
      filtrados = filtrados.filter((item) => item.funcionarioId === Number(funcionarioId));
    }
    if (tipo !== undefined) {
      filtrados = filtrados.filter((item) => item.tipo === tipo);
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

  async somarPorTipoNoPeriodo(funcionarioId, inicio, fim) {
    const doPeriodo = this.itens.filter(
      (item) =>
        item.funcionarioId === Number(funcionarioId) &&
        item.data >= inicio &&
        item.data <= fim,
    );
    const faltas = doPeriodo
      .filter((item) => item.tipo === 'falta')
      .reduce((acc, item) => acc + Number(item.valor), 0);
    const horasExtras = doPeriodo
      .filter((item) => item.tipo === 'hora_extra')
      .reduce((acc, item) => acc + Number(item.valor), 0);
    const naoCumprimento = doPeriodo
      .filter((item) => item.tipo === 'nao_cumprimento')
      .reduce((acc, item) => acc + Number(item.valor), 0);
    return { faltas, horasExtras, naoCumprimento };
  }

  async comNome(ocorrencia) {
    if (!this.funcionarioRepository) {
      return ocorrencia;
    }
    const funcionario = await this.funcionarioRepository.buscarPorId(ocorrencia.funcionarioId);
    ocorrencia.funcionarioNome = funcionario?.nome ?? null;
    return ocorrencia;
  }
}
