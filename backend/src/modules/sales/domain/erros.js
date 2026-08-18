export class CaixaFechadoError extends Error {
  constructor(mensagem = 'Caixa fechado. Abra um turno antes de registrar vendas.') {
    super(mensagem);
    this.name = 'CaixaFechadoError';
    this.status = 403;
    this.codigo = 'CAIXA_FECHADO';
  }
}

export class CarrinhoVazioError extends Error {
  constructor(mensagem = 'A venda precisa de pelo menos um item.') {
    super(mensagem);
    this.name = 'CarrinhoVazioError';
    this.status = 400;
    this.codigo = 'CARRINHO_VAZIO';
  }
}

export class FormaPagamentoInvalidaError extends Error {
  constructor() {
    super('Forma de pagamento inválida.');
    this.name = 'FormaPagamentoInvalidaError';
    this.status = 400;
    this.codigo = 'FORMA_PAGAMENTO_INVALIDA';
  }
}

export class TotalExternoError extends Error {
  constructor() {
    super('total é derivado dos itens e não pode ser informado externamente.');
    this.name = 'TotalExternoError';
    this.status = 400;
    this.codigo = 'TOTAL_EXTERNO';
  }
}

export class TurnoObrigatorioError extends Error {
  constructor() {
    super('Toda venda deve pertencer a um turno.');
    this.name = 'TurnoObrigatorioError';
    this.status = 400;
    this.codigo = 'TURNO_OBRIGATORIO';
  }
}

export class QuantidadeItemInvalidaError extends Error {
  constructor() {
    super('Quantidade do item deve ser maior que zero.');
    this.name = 'QuantidadeItemInvalidaError';
    this.status = 400;
    this.codigo = 'QUANTIDADE_ITEM_INVALIDA';
  }
}

export class VendaNaoEncontradaError extends Error {
  constructor() {
    super('Venda não encontrada.');
    this.name = 'VendaNaoEncontradaError';
    this.status = 404;
    this.codigo = 'VENDA_NAO_ENCONTRADA';
  }
}

export class CorrecaoPendenteNaoEncontradaError extends Error {
  constructor() {
    super('Correção pendente não encontrada.');
    this.name = 'CorrecaoPendenteNaoEncontradaError';
    this.status = 404;
    this.codigo = 'CORRECAO_PENDENTE_NAO_ENCONTRADA';
  }
}

export class SemTurnoAbertoParaCorrecaoError extends Error {
  constructor(mensagem = 'Não há turno aberto para lançar o ajuste da correção.') {
    super(mensagem);
    this.name = 'SemTurnoAbertoParaCorrecaoError';
    this.status = 400;
    this.codigo = 'SEM_TURNO_ABERTO';
  }
}

export class MotivoCancelamentoObrigatorioError extends Error {
  constructor() {
    super('Motivo do cancelamento é obrigatório.');
    this.name = 'MotivoCancelamentoObrigatorioError';
    this.status = 400;
    this.codigo = 'MOTIVO_OBRIGATORIO';
  }
}
