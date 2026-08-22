export class NomeInvalidoError extends Error {
  constructor(mensagem = 'Nome é obrigatório.') {
    super(mensagem);
    this.name = 'NomeInvalidoError';
    this.status = 400;
    this.codigo = 'NOME_INVALIDO';
  }
}

export class TelefoneInvalidoError extends Error {
  constructor(mensagem = 'Telefone é obrigatório.') {
    super(mensagem);
    this.name = 'TelefoneInvalidoError';
    this.status = 400;
    this.codigo = 'TELEFONE_INVALIDO';
  }
}

export class TelefoneJaCadastradoError extends Error {
  constructor() {
    super('Já existe um cliente ativo com este telefone.');
    this.name = 'TelefoneJaCadastradoError';
    this.status = 409;
    this.codigo = 'TELEFONE_JA_CADASTRADO';
  }
}

export class ClienteNaoEncontradoError extends Error {
  constructor() {
    super('Cliente não encontrado.');
    this.name = 'ClienteNaoEncontradoError';
    this.status = 404;
    this.codigo = 'CLIENTE_NAO_ENCONTRADO';
  }
}
