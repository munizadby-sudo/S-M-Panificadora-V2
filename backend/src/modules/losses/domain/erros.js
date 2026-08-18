export class MotivoInvalidoError extends Error {
  constructor(mensagem = 'Motivo de perda inválido.') {
    super(mensagem);
    this.name = 'MotivoInvalidoError';
    this.status = 400;
    this.codigo = 'MOTIVO_INVALIDO';
  }
}

export class QuantidadeInvalidaError extends Error {
  constructor(mensagem = 'Quantidade deve ser maior que zero.') {
    super(mensagem);
    this.name = 'QuantidadeInvalidaError';
    this.status = 400;
    this.codigo = 'QUANTIDADE_INVALIDA';
  }
}

export class PerdaNaoEncontradaError extends Error {
  constructor(mensagem = 'Perda não encontrada.') {
    super(mensagem);
    this.name = 'PerdaNaoEncontradaError';
    this.status = 404;
    this.codigo = 'PERDA_NAO_ENCONTRADA';
  }
}

export class CustoCalculadoExternoError extends Error {
  constructor() {
    super('custoCalculado é derivado internamente e não pode ser informado.');
    this.name = 'CustoCalculadoExternoError';
    this.status = 400;
    this.codigo = 'CUSTO_CALCULADO_EXTERNO';
  }
}
