export class FundoNegativoError extends Error {
  constructor() {
    super('Fundo de caixa não pode ser negativo.');
    this.name = 'FundoNegativoError';
    this.status = 400;
    this.codigo = 'FUNDO_NEGATIVO';
  }
}

export class TurnoJaAbertoError extends Error {
  constructor() {
    super('Já existe um turno de caixa aberto.');
    this.name = 'TurnoJaAbertoError';
    this.status = 409;
    this.codigo = 'TURNO_JA_ABERTO';
  }
}

export class PeriodoJaRegistradoError extends Error {
  constructor() {
    super('Já existe um turno registrado para este período hoje.');
    this.name = 'PeriodoJaRegistradoError';
    this.status = 409;
    this.codigo = 'PERIODO_JA_REGISTRADO';
  }
}

export class NenhumTurnoAbertoError extends Error {
  constructor() {
    super('Não há turno de caixa aberto.');
    this.name = 'NenhumTurnoAbertoError';
    this.status = 400;
    this.codigo = 'CAIXA_FECHADO';
  }
}

export class TurnoNaoEncontradoError extends Error {
  constructor() {
    super('Turno de caixa não encontrado.');
    this.name = 'TurnoNaoEncontradoError';
    this.status = 404;
    this.codigo = 'TURNO_NAO_ENCONTRADO';
  }
}
