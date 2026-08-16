export class ChaveConfiguracaoInvalidaError extends Error {
  constructor(chave) {
    super(`Chave de configuração inválida: ${chave}.`);
    this.name = 'ChaveConfiguracaoInvalidaError';
    this.status = 400;
    this.codigo = 'CHAVE_CONFIGURACAO_INVALIDA';
  }
}

export class ArquivoLogoInvalidoError extends Error {
  constructor(mensagem = 'Arquivo de logo inválido.') {
    super(mensagem);
    this.name = 'ArquivoLogoInvalidoError';
    this.status = 400;
    this.codigo = 'ARQUIVO_LOGO_INVALIDO';
  }
}
