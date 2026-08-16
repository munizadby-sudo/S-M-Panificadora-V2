import { CHAVES_CONFIGURACAO, CHAVES_WHITELIST, interpretarValor } from '../domain/chaves.js';

export class GetConfiguracoes {
  constructor({ configuracaoRepository }) {
    this.configuracaoRepository = configuracaoRepository;
  }

  async executar() {
    const linhas = await this.configuracaoRepository.listar();
    const mapa = Object.fromEntries(linhas.map((linha) => [linha.chave, linha.valor]));
    const saida = {};

    for (const chave of CHAVES_WHITELIST) {
      saida[chave] = interpretarValor(chave, mapa[chave] ?? CHAVES_CONFIGURACAO[chave].padrao);
    }

    return saida;
  }
}
