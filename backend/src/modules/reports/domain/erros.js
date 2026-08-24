export class PeriodoInvalidoError extends Error {
  constructor(mensagem = 'Período inválido. Informe data_inicio e data_fim (YYYY-MM-DD) com data_inicio ≤ data_fim.') {
    super(mensagem);
    this.name = 'PeriodoInvalidoError';
    this.status = 400;
    this.codigo = 'PERIODO_INVALIDO';
  }
}
