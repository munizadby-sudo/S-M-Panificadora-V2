import { Categoria } from '../../src/modules/products/domain/Categoria.js';
import { CategoriaRepository } from '../../src/modules/products/application/ports.js';
import { CategoriaJaExisteError } from '../../src/modules/products/domain/erros.js';

export class MemoriaCategoriaRepository extends CategoriaRepository {
  constructor() {
    super();
    this.itens = [];
    this.proximoId = 1;
  }

  async listar({ ativo } = {}) {
    return this.itens
      .filter((item) => (ativo === undefined ? true : item.ativo === Boolean(ativo)))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async buscarPorId(id) {
    return this.itens.find((item) => item.id === Number(id)) ?? null;
  }

  async buscarPorNome(nome) {
    return this.itens.find((item) => item.nome === nome) ?? null;
  }

  async existeNomeAtivo(nome, excetoId = null) {
    return this.itens.some(
      (item) => item.nome === nome && (excetoId == null || item.id !== Number(excetoId)),
    );
  }

  async salvar(categoria) {
    if (await this.existeNomeAtivo(categoria.nome)) {
      throw new CategoriaJaExisteError();
    }
    const salva = new Categoria({
      ...categoria,
      id: this.proximoId,
      criadoEm: new Date().toISOString(),
    });
    this.proximoId += 1;
    this.itens.push(salva);
    return salva;
  }

  async atualizar(categoria) {
    if (categoria.ativo && (await this.existeNomeAtivo(categoria.nome, categoria.id))) {
      throw new CategoriaJaExisteError();
    }
    const indice = this.itens.findIndex((item) => item.id === categoria.id);
    if (indice < 0) {
      return null;
    }
    this.itens[indice] = categoria;
    return categoria;
  }
}
