import { Funcionario } from '../../src/modules/employees/domain/Funcionario.js';
import { FuncionarioRepository } from '../../src/modules/employees/application/ports.js';

export class MemoriaFuncionarioRepository extends FuncionarioRepository {
  constructor() {
    super();
    this.itens = [];
    this.proximoId = 1;
  }

  async listar({ ativo, busca, page = 1, limit = 20 } = {}) {
    let filtrados = [...this.itens];
    if (ativo !== undefined) {
      filtrados = filtrados.filter((item) => item.ativo === Boolean(ativo));
    }
    if (busca) {
      const termo = busca.toLowerCase();
      filtrados = filtrados.filter(
        (item) =>
          item.nome.toLowerCase().includes(termo) || item.cargo.toLowerCase().includes(termo),
      );
    }
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome) || a.id - b.id);
    const total = filtrados.length;
    const inicio = (page - 1) * limit;
    return { data: filtrados.slice(inicio, inicio + limit), total };
  }

  async buscarPorId(id) {
    return this.itens.find((item) => item.id === Number(id)) ?? null;
  }

  async salvar(funcionario) {
    const salvo = new Funcionario({
      ...funcionario,
      id: this.proximoId,
      criadoEm: new Date().toISOString(),
    });
    this.proximoId += 1;
    this.itens.push(salvo);
    return salvo;
  }

  async atualizar(funcionario) {
    const indice = this.itens.findIndex((item) => item.id === funcionario.id);
    if (indice < 0) {
      return null;
    }
    this.itens[indice] = funcionario;
    return funcionario;
  }
}
