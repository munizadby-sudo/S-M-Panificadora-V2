import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';
import { EstoqueRepository } from '../../src/modules/inventory/application/ports.js';

export class MemoriaEstoqueRepository extends EstoqueRepository {
  constructor() {
    super();
    this.itens = [];
    this.proximoId = 1;
  }

  async buscarPorProdutoEData(produtoId, data, _conexao) {
    const encontrado = this.itens.find(
      (item) => item.produtoId === Number(produtoId) && item.data === String(data),
    );
    return encontrado ? clonar(encontrado) : null;
  }

  async buscarMaisRecenteAnterior(produtoId, data, _conexao) {
    const candidatos = this.itens
      .filter((item) => item.produtoId === Number(produtoId) && item.data < String(data))
      .sort((a, b) => b.data.localeCompare(a.data));
    return candidatos[0] ? clonar(candidatos[0]) : null;
  }

  async salvar(estoque, _conexao) {
    const duplicado = this.itens.some(
      (item) => item.produtoId === estoque.produtoId && item.data === estoque.data,
    );
    if (duplicado) {
      const erro = new Error('Duplicate entry');
      erro.errno = 1062;
      throw erro;
    }
    const salvo = clonar(estoque);
    salvo.id = this.proximoId;
    this.proximoId += 1;
    this.itens.push(clonar(salvo));
    return clonar(salvo);
  }

  async atualizar(estoque, _conexao) {
    const indice = this.itens.findIndex((item) => item.id === estoque.id);
    if (indice < 0) {
      return null;
    }
    this.itens[indice] = clonar(estoque);
    return clonar(estoque);
  }

  async bloquearPorProdutoEData(produtoId, data, conexao) {
    return this.buscarPorProdutoEData(produtoId, data, conexao);
  }

  async comTransacao(fn) {
    const snapshot = this.itens.map(clonar);
    const proximoId = this.proximoId;
    try {
      return await fn(this);
    } catch (erro) {
      this.itens = snapshot;
      this.proximoId = proximoId;
      throw erro;
    }
  }
}

function clonar(estoque) {
  return new EstoqueDiario({
    id: estoque.id,
    produtoId: estoque.produtoId,
    data: estoque.data,
    inicial: estoque.inicial,
    produzido: estoque.produzido,
    vendido: estoque.vendido,
    minimo: estoque.minimo,
    atualizadoEm: estoque.atualizadoEm,
  });
}
