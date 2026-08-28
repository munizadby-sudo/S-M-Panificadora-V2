export class SalarioInvalidoError extends Error {
  constructor(mensagem = 'Salário base deve ser maior que zero.') {
    super(mensagem);
    this.name = 'SalarioInvalidoError';
    this.status = 400;
    this.codigo = 'SALARIO_INVALIDO';
  }
}

export class NomeInvalidoError extends Error {
  constructor(mensagem = 'Nome é obrigatório.') {
    super(mensagem);
    this.name = 'NomeInvalidoError';
    this.status = 400;
    this.codigo = 'NOME_INVALIDO';
  }
}

export class CargoInvalidoError extends Error {
  constructor(mensagem = 'Cargo é obrigatório.') {
    super(mensagem);
    this.name = 'CargoInvalidoError';
    this.status = 400;
    this.codigo = 'CARGO_INVALIDO';
  }
}

export class PeriodicidadeInvalidaError extends Error {
  constructor(mensagem = 'Periodicidade deve ser mensal ou quinzenal.') {
    super(mensagem);
    this.name = 'PeriodicidadeInvalidaError';
    this.status = 400;
    this.codigo = 'PERIODICIDADE_INVALIDA';
  }
}

export class DataAdmissaoInvalidaError extends Error {
  constructor(mensagem = 'Data de admissão é obrigatória.') {
    super(mensagem);
    this.name = 'DataAdmissaoInvalidaError';
    this.status = 400;
    this.codigo = 'DATA_ADMISSAO_INVALIDA';
  }
}

export class ValorAdiantamentoInvalidoError extends Error {
  constructor(mensagem = 'Valor do adiantamento deve ser maior que zero.') {
    super(mensagem);
    this.name = 'ValorAdiantamentoInvalidoError';
    this.status = 400;
    this.codigo = 'VALOR_ADIANTAMENTO_INVALIDO';
  }
}

export class TipoOcorrenciaInvalidoError extends Error {
  constructor(mensagem = 'Tipo de ocorrência inválido.') {
    super(mensagem);
    this.name = 'TipoOcorrenciaInvalidoError';
    this.status = 400;
    this.codigo = 'TIPO_OCORRENCIA_INVALIDO';
  }
}

export class MotivoOcorrenciaInvalidoError extends Error {
  constructor(
    mensagem = 'Informe o motivo do não cumprimento (produção, cozinha ou produção incorreta).',
  ) {
    super(mensagem);
    this.name = 'MotivoOcorrenciaInvalidoError';
    this.status = 400;
    this.codigo = 'MOTIVO_OCORRENCIA_INVALIDO';
  }
}

export class ValorOcorrenciaInvalidoError extends Error {
  constructor(mensagem = 'Valor da ocorrência deve ser maior ou igual a zero.') {
    super(mensagem);
    this.name = 'ValorOcorrenciaInvalidoError';
    this.status = 400;
    this.codigo = 'VALOR_OCORRENCIA_INVALIDO';
  }
}

export class FuncionarioNaoEncontradoError extends Error {
  constructor(mensagem = 'Funcionário não encontrado.') {
    super(mensagem);
    this.name = 'FuncionarioNaoEncontradoError';
    this.status = 404;
    this.codigo = 'FUNCIONARIO_NAO_ENCONTRADO';
  }
}

export class FuncionarioInativoError extends Error {
  constructor(mensagem = 'Funcionário inativo.') {
    super(mensagem);
    this.name = 'FuncionarioInativoError';
    this.status = 400;
    this.codigo = 'FUNCIONARIO_INATIVO';
  }
}

export class FolhaJaFechadaError extends Error {
  constructor(mensagem = 'Já existe folha fechada para este funcionário neste período.') {
    super(mensagem);
    this.name = 'FolhaJaFechadaError';
    this.status = 409;
    this.codigo = 'FOLHA_JA_FECHADA';
  }
}

export class FolhaNaoEncontradaError extends Error {
  constructor(mensagem = 'Folha não encontrada.') {
    super(mensagem);
    this.name = 'FolhaNaoEncontradaError';
    this.status = 404;
    this.codigo = 'FOLHA_NAO_ENCONTRADA';
  }
}

export class PeriodoFolhaInvalidoError extends Error {
  constructor(mensagem = 'Período da folha inválido.') {
    super(mensagem);
    this.name = 'PeriodoFolhaInvalidoError';
    this.status = 400;
    this.codigo = 'PERIODO_FOLHA_INVALIDO';
  }
}
