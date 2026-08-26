/** F2 = Todas; F3…F8 = categorias na ordem da lista (SPEC-FE-007 Passo 8 / atalhos V1). */
export const MAPA_TECLAS_CATEGORIA = Object.freeze({
  F2: 0,
  F3: 1,
  F4: 2,
  F5: 3,
  F6: 4,
  F7: 5,
  F8: 6,
});

const CAMPOS_DIGITAVEIS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

export function indiceCategoriaPorTecla(tecla) {
  if (!Object.prototype.hasOwnProperty.call(MAPA_TECLAS_CATEGORIA, tecla)) {
    return undefined;
  }
  return MAPA_TECLAS_CATEGORIA[tecla];
}

export function estaEmCampoDigitavel(alvo) {
  return CAMPOS_DIGITAVEIS.has(alvo?.tagName);
}

export function deveRoubarTeclaDeEdicao(evento) {
  return estaEmCampoDigitavel(evento?.target);
}

const SETAS = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']);

/** Setas navegam a grade mesmo com foco na busca (↑↓) ou no select de categoria. */
export function setasNavegamPelaGrade(evento) {
  if (!SETAS.has(evento?.key)) {
    return false;
  }
  const alvo = evento?.target;
  if (!estaEmCampoDigitavel(alvo)) {
    return true;
  }
  if (alvo?.id === 'pdv-categoria') {
    return true;
  }
  if (alvo?.id === 'pdv-busca') {
    return evento.key === 'ArrowUp' || evento.key === 'ArrowDown';
  }
  return false;
}

export function enterAdicionaDaBusca(evento) {
  return evento?.key === 'Enter' && evento?.target?.id === 'pdv-busca';
}
