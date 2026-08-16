export const CHAVES_CONFIGURACAO = {
  nome_loja: { publica: true, padrao: 'S&M Panificadora', numerico: false },
  slogan: { publica: true, padrao: 'Pão fresquinho todo dia', numerico: false },
  logo_url: { publica: true, padrao: '', numerico: false },
  fundo_troco_especie: { publica: false, padrao: '40.00', numerico: true },
  fundo_troco_moedas: { publica: false, padrao: '10.00', numerico: true },
};

export const CHAVES_WHITELIST = Object.keys(CHAVES_CONFIGURACAO);
export const CHAVES_PUBLICAS = CHAVES_WHITELIST.filter((chave) => CHAVES_CONFIGURACAO[chave].publica);

export function ehChaveConhecida(chave) {
  return Object.hasOwn(CHAVES_CONFIGURACAO, chave);
}

export function padroesParaSeed() {
  return CHAVES_WHITELIST.map((chave) => ({
    chave,
    valor: CHAVES_CONFIGURACAO[chave].padrao,
  }));
}

export function interpretarValor(chave, valor) {
  if (CHAVES_CONFIGURACAO[chave]?.numerico) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }
  return valor == null ? '' : String(valor);
}
