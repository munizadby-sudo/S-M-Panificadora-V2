import { apiGet } from '../../core/api.js';

export const CAMINHO_IDENTIDADE_PUBLICA = '/configuracoes/publico';
export const NOME_LOJA_PADRAO = 'S&M Panificadora';

export async function aplicarIdentidadeVisual({ titulo, slogan, logo } = {}) {
  try {
    const dados = await apiGet(CAMINHO_IDENTIDADE_PUBLICA);
    if (!dados || typeof dados !== 'object') {
      return;
    }

    const nome = dados.nome_loja || dados.nome;
    const logoUrl = dados.logo_url || dados.logoUrl;

    if (nome && titulo) {
      titulo.textContent = nome;
    }
    if (dados.slogan && slogan) {
      slogan.textContent = dados.slogan;
    }
    if (logoUrl && logo) {
      logo.src = logoUrl;
      logo.hidden = false;
    }
  } catch {
    /* endpoint indisponível: permanece o padrão do Passo 1 */
  }
}
