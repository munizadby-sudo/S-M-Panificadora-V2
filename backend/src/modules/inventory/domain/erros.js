export class EstoqueInsuficienteError extends Error {
  constructor(mensagem = 'Estoque insuficiente.') {
    super(mensagem);
    this.name = 'EstoqueInsuficienteError';
    this.status = 400;
    this.codigo = 'ESTOQUE_INSUFICIENTE';
  }
}

export class ProdutoInativoError extends Error {
  constructor(mensagem = 'Não é possível lançar estoque de produto desativado.') {
    super(mensagem);
    this.name = 'ProdutoInativoError';
    this.status = 400;
    this.codigo = 'PRODUTO_INATIVO';
  }
}

export class QuantidadeInvalidaError extends Error {
  constructor(campo, mensagem = `${campo} não pode ser negativo.`) {
    super(mensagem);
    this.name = 'QuantidadeInvalidaError';
    this.status = 400;
    this.codigo = 'QUANTIDADE_INVALIDA';
    this.campo = campo;
  }
}

export class DataEstoqueInvalidaError extends Error {
  constructor(mensagem = 'Data do estoque é obrigatória.') {
    super(mensagem);
    this.name = 'DataEstoqueInvalidaError';
    this.status = 400;
    this.codigo = 'DATA_ESTOQUE_INVALIDA';
  }
}

export class ItemLoteInvalidoError extends Error {
  constructor(produtoId, causa) {
    const detalhe = causa?.message || 'item inválido';
    super(`Item produto_id=${produtoId}: ${detalhe}`);
    this.name = 'ItemLoteInvalidoError';
    this.status = causa?.status || 400;
    this.codigo = 'ITEM_LOTE_INVALIDO';
    this.produtoId = produtoId;
    this.causa = causa;
  }
}

export class LoteInvalidoError extends Error {
  constructor(mensagem = 'Lista de itens é obrigatória.') {
    super(mensagem);
    this.name = 'LoteInvalidoError';
    this.status = 400;
    this.codigo = 'LOTE_INVALIDO';
  }
}
