export class ErroDeDominio extends Error {
  constructor(mensagem, status, codigo) {
    super(mensagem);
    this.name = this.constructor.name;
    this.status = status;
    this.codigo = codigo;
  }
}

export class CredenciaisInvalidasError extends ErroDeDominio {
  constructor() {
    super('Usuário ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
  }
}

export class PermissaoInvalidaError extends ErroDeDominio {
  constructor(permissao) {
    super(`Permissão inválida: ${permissao}.`, 400, 'PERMISSAO_INVALIDA');
  }
}

export class UsuarioJaExisteError extends ErroDeDominio {
  constructor() {
    super('Username já existe.', 409, 'USUARIO_JA_EXISTE');
  }
}

export class AutoDesativacaoNaoPermitidaError extends ErroDeDominio {
  constructor() {
    super('Você não pode desativar seu próprio usuário.', 400, 'AUTO_DESATIVACAO');
  }
}

export class RoleInvalidaError extends ErroDeDominio {
  constructor(role) {
    super(`Papel inválido: ${role}.`, 400, 'ROLE_INVALIDA');
  }
}

export class UsuarioNaoEncontradoError extends ErroDeDominio {
  constructor() {
    super('Usuário não encontrado.', 404, 'USUARIO_NAO_ENCONTRADO');
  }
}

export class CamposObrigatoriosError extends ErroDeDominio {
  constructor(mensagem = 'Campo obrigatório ausente.') {
    super(mensagem, 400, 'CAMPOS_OBRIGATORIOS');
  }
}
