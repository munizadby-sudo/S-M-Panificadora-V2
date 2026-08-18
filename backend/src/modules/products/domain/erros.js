export class NomeInvalidoError extends Error {
  constructor(mensagem = 'Nome é obrigatório.') {
    super(mensagem);
    this.name = 'NomeInvalidoError';
    this.status = 400;
    this.codigo = 'NOME_INVALIDO';
  }
}

export class PrecoInvalidoError extends Error {
  constructor(mensagem = 'Preço deve ser maior que zero.') {
    super(mensagem);
    this.name = 'PrecoInvalidoError';
    this.status = 400;
    this.codigo = 'PRECO_INVALIDO';
  }
}

export class CustoInvalidoError extends Error {
  constructor(mensagem = 'Custo não pode ser negativo.') {
    super(mensagem);
    this.name = 'CustoInvalidoError';
    this.status = 400;
    this.codigo = 'CUSTO_INVALIDO';
  }
}

export class NomeDuplicadoNaCategoriaError extends Error {
  constructor() {
    super('Já existe um produto com este nome nesta categoria.');
    this.name = 'NomeDuplicadoNaCategoriaError';
    this.status = 409;
    this.codigo = 'NOME_DUPLICADO_NA_CATEGORIA';
  }
}

export class CategoriaJaExisteError extends Error {
  constructor() {
    super('Já existe uma categoria com este nome.');
    this.name = 'CategoriaJaExisteError';
    this.status = 409;
    this.codigo = 'CATEGORIA_JA_EXISTE';
  }
}

export class ProdutoNaoEncontradoError extends Error {
  constructor() {
    super('Produto não encontrado.');
    this.name = 'ProdutoNaoEncontradoError';
    this.status = 404;
    this.codigo = 'PRODUTO_NAO_ENCONTRADO';
  }
}

export class CategoriaNaoEncontradaError extends Error {
  constructor() {
    super('Categoria não encontrada.');
    this.name = 'CategoriaNaoEncontradaError';
    this.status = 404;
    this.codigo = 'CATEGORIA_NAO_ENCONTRADA';
  }
}
