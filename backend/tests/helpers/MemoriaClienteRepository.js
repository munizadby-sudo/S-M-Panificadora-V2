import { Cliente } from '../../src/modules/customers/domain/Cliente.js';
import { ClienteRepository } from '../../src/modules/customers/application/ports.js';
import { TelefoneJaCadastradoError } from '../../src/modules/customers/domain/erros.js';

export class MemoriaClienteRepository extends ClienteRepository {
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
          item.nome.toLowerCase().includes(termo) || item.telefone.toLowerCase().includes(termo),
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

  async existeTelefoneAtivo(telefone, excetoId = null) {
    return this.itens.some(
      (item) =>
        item.ativo &&
        item.telefone === telefone &&
        (excetoId == null || item.id !== Number(excetoId)),
    );
  }

  async salvar(cliente) {
    if (await this.existeTelefoneAtivo(cliente.telefone)) {
      throw new TelefoneJaCadastradoError();
    }
    const salvo = new Cliente({
      ...cliente,
      id: this.proximoId,
      criadoEm: new Date().toISOString(),
    });
    this.proximoId += 1;
    this.itens.push(salvo);
    return salvo;
  }

  async atualizar(cliente) {
    if (await this.existeTelefoneAtivo(cliente.telefone, cliente.id)) {
      throw new TelefoneJaCadastradoError();
    }
    const indice = this.itens.findIndex((item) => item.id === cliente.id);
    if (indice < 0) {
      return null;
    }
    this.itens[indice] = cliente;
    return cliente;
  }
}
