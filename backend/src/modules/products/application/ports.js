export class CategoriaRepository {
  async listar(_filtros) {
    throw new Error('CategoriaRepository.listar não implementado');
  }

  async buscarPorId(_id) {
    throw new Error('CategoriaRepository.buscarPorId não implementado');
  }

  async buscarPorNome(_nome) {
    throw new Error('CategoriaRepository.buscarPorNome não implementado');
  }

  async existeNomeAtivo(_nome, _excetoId) {
    throw new Error('CategoriaRepository.existeNomeAtivo não implementado');
  }

  async salvar(_categoria) {
    throw new Error('CategoriaRepository.salvar não implementado');
  }

  async atualizar(_categoria) {
    throw new Error('CategoriaRepository.atualizar não implementado');
  }
}

export class ProdutoRepository {
  async listar(_filtros) {
    throw new Error('ProdutoRepository.listar não implementado');
  }

  async buscarPorId(_id) {
    throw new Error('ProdutoRepository.buscarPorId não implementado');
  }

  async existeNomeNaCategoria(_categoriaId, _nome, _excetoId) {
    throw new Error('ProdutoRepository.existeNomeNaCategoria não implementado');
  }

  async salvar(_produto) {
    throw new Error('ProdutoRepository.salvar não implementado');
  }

  async atualizar(_produto) {
    throw new Error('ProdutoRepository.atualizar não implementado');
  }
}
