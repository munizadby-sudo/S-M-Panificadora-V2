import { apiGet, obterApiBaseUrl } from '../../core/api.js';

export const CAMINHO_IDENTIDADE_PUBLICA = '/configuracoes/publico';
export const NOME_LOJA_PADRAO = 'S&M Panificadora';

/** Caminhos relativos (/uploads/...) apontam para o host da API, não do frontend estático. */
export function resolverUrlLogo(logoUrl) {
  const url = String(logoUrl || '').trim();
  if (!url) {
    return '';
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    const apiBase = obterApiBaseUrl();
    if (/^https?:\/\//i.test(apiBase)) {
      const origem = apiBase.replace(/\/api\/?$/i, '');
      return `${origem}${url}`;
    }
    return url;
  }
  return url;
}

export async function aplicarIdentidadeVisual({ titulo, slogan, logo } = {}) {
  try {
    const dados = await apiGet(CAMINHO_IDENTIDADE_PUBLICA);
    if (!dados || typeof dados !== 'object') {
      return;
    }

    const nome = dados.nome_loja || dados.nome;
    const logoUrl = resolverUrlLogo(dados.logo_url || dados.logoUrl);

    if (nome && titulo) {
      titulo.textContent = nome;
    }
    if (dados.slogan && slogan) {
      slogan.textContent = dados.slogan;
    }
    if (logoUrl && logo) {
      logo.hidden = true;
      logo.onerror = () => {
        logo.hidden = true;
        logo.removeAttribute('src');
      };
      logo.onload = () => {
        logo.hidden = false;
      };
      logo.src = logoUrl;
      if (logo.complete && logo.naturalWidth > 0) {
        logo.hidden = false;
      }
    }
  } catch {
    /* endpoint indisponível: permanece o padrão do Passo 1 */
  }
}
