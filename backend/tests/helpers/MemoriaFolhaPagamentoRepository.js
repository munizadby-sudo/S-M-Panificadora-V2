import { FolhaPagamento } from '../../src/modules/employees/domain/FolhaPagamento.js';
import { FolhaPagamentoRepository } from '../../src/modules/employees/application/ports.js';

export class MemoriaFolhaPagamentoRepository extends FolhaPagamentoRepository {
  constructor({ funcionarioRepository } = {}) {
    super();
    this.itens = [];
    this.proximoId = 1;
    this.funcionarioRepository = funcionarioRepository;
  }

  async salvar(folha) {
    const chave = chavePeriodo(folha.funcionarioId, folha.periodoInicio, folha.periodoFim);
    if (this.itens.some((item) => chavePeriodo(item.funcionarioId, item.periodoInicio, item.periodoFim) === chave)) {
      const erro = new Error('Duplicate entry');
      erro.errno = 1062;
      throw erro;
    }
    const salva = new FolhaPagamento({
      ...folha,
      id: this.proximoId,
      criadoEm: new Date().toISOString(),
    });
    this.proximoId += 1;
    const comNome = await this.comNome(salva);
    this.itens.push(comNome);
    return comNome;
  }

  async atualizar(folha) {
    const indice = this.itens.findIndex((item) => item.id === folha.id);
    if (indice < 0) {
      return null;
    }
    const comNome = await this.comNome(folha);
    this.itens[indice] = comNome;
    return comNome;
  }

  async buscarPorId(id) {
    return this.itens.find((item) => item.id === Number(id)) ?? null;
  }

  async buscarPorFuncionarioEPeriodo(funcionarioId, inicio, fim) {
    return (
      this.itens.find(
        (item) =>
          item.funcionarioId === Number(funcionarioId) &&
          item.periodoInicio === inicio &&
          item.periodoFim === fim,
      ) ?? null
    );
  }

  async listar({
    funcionarioId,
    status,
    periodoInicio,
    periodoFim,
    page = 1,
    limit = 20,
  } = {}) {
    let filtrados = [...this.itens];
    if (funcionarioId !== undefined) {
      filtrados = filtrados.filter((item) => item.funcionarioId === Number(funcionarioId));
    }
    if (status !== undefined) {
      filtrados = filtrados.filter((item) => item.status === status);
    }
    if (periodoInicio) {
      filtrados = filtrados.filter((item) => item.periodoInicio >= periodoInicio);
    }
    if (periodoFim) {
      filtrados = filtrados.filter((item) => item.periodoFim <= periodoFim);
    }
    filtrados.sort(
      (a, b) => b.periodoInicio.localeCompare(a.periodoInicio) || b.id - a.id,
    );
    const total = filtrados.length;
    const inicio = (page - 1) * limit;
    return { data: filtrados.slice(inicio, inicio + limit), total };
  }

  async comNome(folha) {
    if (!this.funcionarioRepository) {
      return folha;
    }
    const funcionario = await this.funcionarioRepository.buscarPorId(folha.funcionarioId);
    folha.funcionarioNome = funcionario?.nome ?? null;
    return folha;
  }
}

function chavePeriodo(funcionarioId, inicio, fim) {
  return `${funcionarioId}|${inicio}|${fim}`;
}
