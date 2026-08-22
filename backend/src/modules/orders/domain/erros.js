export class ItensObrigatoriosError extends Error {
  constructor(mensagem = 'Encomenda precisa de pelo menos um item.') {
    super(mensagem);
    this.name = 'ItensObrigatoriosError';
    this.status = 400;
    this.codigo = 'ITENS_OBRIGATORIOS';
  }
}

export class QuantidadeItemInvalidaError extends Error {
  constructor(mensagem = 'Quantidade do item deve ser maior que zero.') {
    super(mensagem);
    this.name = 'QuantidadeItemInvalidaError';
    this.status = 400;
    this.codigo = 'QUANTIDADE_ITEM_INVALIDA';
  }
}

export class StatusEncomendaInvalidoError extends Error {
  constructor(mensagem = 'Status de encomenda inválido.') {
    super(mensagem);
    this.name = 'StatusEncomendaInvalidoError';
    this.status = 400;
    this.codigo = 'STATUS_ENCOMENDA_INVALIDO';
  }
}

export class SinalInvalidoError extends Error {
  constructor(mensagem = 'Sinal não pode ser negativo.') {
    super(mensagem);
    this.name = 'SinalInvalidoError';
    this.status = 400;
    this.codigo = 'SINAL_INVALIDO';
  }
}

export class ClienteContatoObrigatorioError extends Error {
  constructor(mensagem = 'Nome e telefone de contato são obrigatórios.') {
    super(mensagem);
    this.name = 'ClienteContatoObrigatorioError';
    this.status = 400;
    this.codigo = 'CLIENTE_CONTATO_OBRIGATORIO';
  }
}

export class UsuarioExecutorObrigatorioError extends Error {
  constructor(mensagem = 'Usuário executor é obrigatório.') {
    super(mensagem);
    this.name = 'UsuarioExecutorObrigatorioError';
    this.status = 400;
    this.codigo = 'USUARIO_EXECUTOR_OBRIGATORIO';
  }
}

export class EncomendaNaoEncontradaError extends Error {
  constructor() {
    super('Encomenda não encontrada.');
    this.name = 'EncomendaNaoEncontradaError';
    this.status = 404;
    this.codigo = 'ENCOMENDA_NAO_ENCONTRADA';
  }
}
