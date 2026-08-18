import { Produto } from '../../src/modules/products/domain/Produto.js';
import { ProdutoRepository } from '../../src/modules/products/application/ports.js';
import { NomeDuplicadoNaCategoriaError } from '../../src/modules/products/domain/erros.js';

export class MemoriaProdutoRepository extends ProdutoRepository {
  constructor() {
    super();
    this.itens = [];
    this.proximoId = 1;
  }

  async listar({ categoriaId, ativo, busca, page = 1, limit = 20 } = {}) {
    let filtrados = [...this.itens];
    if (categoriaId !== undefined) {
      filtrados = filtrados.filter((item) => item.categoriaId === Number(categoriaId));
    }
    if (ativo !== undefined) {
      filtrados = filtrados.filter((item) => item.ativo === Boolean(ativo));
    }
    if (busca) {
      const termo = busca.toLowerCase();
      filtrados = filtrados.filter((item) => item.nome.toLowerCase().includes(termo));
    }
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
    const total = filtrados.length;
    const inicio = (page - 1) * limit;
    return { data: filtrados.slice(inicio, inicio + limit), total };
  }

  async buscarPorId(id) {
    return this.itens.find((item) => item.id === Number(id)) ?? null;
  }

  async existeNomeNaCategoria(categoriaId, nome, excetoId = null) {
    return this.itens.some(
      (item) =>
        item.categoriaId === Number(categoriaId) &&
        item.nome === nome &&
        (excetoId == null || item.id !== Number(excetoId)),
    );
  }

  async salvar(produto) {
    if (await this.existeNomeNaCategoria(produto.categoriaId, produto.nome)) {
      throw new NomeDuplicadoNaCategoriaError();
    }
    const salvo = new Produto({
      ...produto,
      id: this.proximoId,
      criadoEm: new Date().toISOString(),
    });
    this.proximoId += 1;
    this.itens.push(salvo);
    return salvo;
  }

  async atualizar(produto) {
    if (await this.existeNomeNaCategoria(produto.categoriaId, produto.nome, produto.id)) {
      throw new NomeDuplicadoNaCategoriaError();
    }
    const indice = this.itens.findIndex((item) => item.id === produto.id);
    if (indice < 0) {
      return null;
    }
    this.itens[indice] = produto;
    return produto;
  }
}
