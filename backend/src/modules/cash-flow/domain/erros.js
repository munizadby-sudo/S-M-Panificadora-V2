export class ValorInvalidoError extends Error {
  constructor(mensagem = 'Valor deve ser maior que zero.') {
    super(mensagem);
    this.name = 'ValorInvalidoError';
    this.status = 400;
    this.codigo = 'VALOR_INVALIDO';
  }
}

export class TipoInvalidoError extends Error {
  constructor(mensagem = 'Tipo deve ser entrada ou saída.') {
    super(mensagem);
    this.name = 'TipoInvalidoError';
    this.status = 400;
    this.codigo = 'TIPO_INVALIDO';
  }
}

export class TurnoObrigatorioError extends Error {
  constructor(mensagem = 'Turno é obrigatório para o lançamento.') {
    super(mensagem);
    this.name = 'TurnoObrigatorioError';
    this.status = 400;
    this.codigo = 'TURNO_OBRIGATORIO';
  }
}

export class LancamentoNaoEncontradoError extends Error {
  constructor() {
    super('Lançamento não encontrado.');
    this.name = 'LancamentoNaoEncontradoError';
    this.status = 404;
    this.codigo = 'LANCAMENTO_NAO_ENCONTRADO';
  }
}

export class ExclusaoDeLancamentoAutomaticoNaoPermitidaError extends Error {
  constructor() {
    super('Lançamentos automáticos só podem ser excluídos por administradores.');
    this.name = 'ExclusaoDeLancamentoAutomaticoNaoPermitidaError';
    this.status = 403;
    this.codigo = 'EXCLUSAO_AUTOMATICO_NAO_PERMITIDA';
  }
}

export class MotivoExclusaoObrigatorioError extends Error {
  constructor() {
    super('Motivo da exclusão é obrigatório.');
    this.name = 'MotivoExclusaoObrigatorioError';
    this.status = 400;
    this.codigo = 'MOTIVO_OBRIGATORIO';
  }
}
