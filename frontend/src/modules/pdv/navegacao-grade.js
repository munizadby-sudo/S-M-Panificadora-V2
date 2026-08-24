/**
 * Roving tabindex na grade de produtos (SPEC-FE-015 §3.5).
 * Tab nunca é interceptado — sai da grade.
 */

export function contarColunasVisiveis(container) {
  if (!container?.children?.length) {
    return 1;
  }
  const cards = [...container.querySelectorAll?.('.pdv-produto')].filter(Boolean);
  if (cards.length === 0) {
    return 1;
  }
  const primeiroTop = cards[0].offsetTop ?? 0;
  let colunas = 0;
  for (const card of cards) {
    if ((card.offsetTop ?? 0) !== primeiroTop) {
      break;
    }
    colunas += 1;
  }
  return Math.max(1, colunas || 1);
}

export function indiceAposSeta(indiceAtual, tecla, total, colunas) {
  if (total <= 0) {
    return 0;
  }
  const cols = Math.max(1, colunas);
  let proximo = indiceAtual;
  switch (tecla) {
    case 'ArrowRight':
      proximo = Math.min(total - 1, indiceAtual + 1);
      break;
    case 'ArrowLeft':
      proximo = Math.max(0, indiceAtual - 1);
      break;
    case 'ArrowDown':
      proximo = Math.min(total - 1, indiceAtual + cols);
      break;
    case 'ArrowUp':
      proximo = Math.max(0, indiceAtual - cols);
      break;
    default:
      return indiceAtual;
  }
  return proximo;
}

export function aplicarRovingTabindex(cards, indiceFoco) {
  const lista = [...(cards || [])];
  if (lista.length === 0) {
    return -1;
  }
  const seguro = Math.max(0, Math.min(indiceFoco, lista.length - 1));
  lista.forEach((card, i) => {
    const ativo = i === seguro;
    card.tabIndex = ativo ? 0 : -1;
    card.classList.toggle('pdv-produto-foco', ativo);
  });
  return seguro;
}

export function ligarNavegacaoGrade(containerGrade, { aoAtivar } = {}) {
  if (!containerGrade) {
    return () => {};
  }

  let indiceFoco = 0;

  const cards = () => [...(containerGrade.querySelectorAll?.('.pdv-produto') || [])];

  const sincronizar = (focarDom = false) => {
    const lista = cards();
    indiceFoco = aplicarRovingTabindex(lista, indiceFoco);
    if (focarDom && lista[indiceFoco]) {
      lista[indiceFoco].focus?.();
    }
  };

  sincronizar(false);

  const onKeyDown = (evento) => {
    const lista = cards();
    if (lista.length === 0) {
      return;
    }

    const tecla = evento.key;
    if (tecla === 'Enter') {
      const alvo = lista[indiceFoco] || lista.find((c) => c === document.activeElement);
      if (alvo) {
        evento.preventDefault();
        aoAtivar?.(alvo);
      }
      return;
    }

    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(tecla)) {
      return;
    }

    evento.preventDefault();
    const colunas = contarColunasVisiveis(containerGrade);
    const atual = lista.findIndex((c) => c === document.activeElement);
    if (atual >= 0) {
      indiceFoco = atual;
    }
    indiceFoco = indiceAposSeta(indiceFoco, tecla, lista.length, colunas);
    sincronizar(true);
  };

  containerGrade.addEventListener('keydown', onKeyDown);

  containerGrade.addEventListener('focusin', (evento) => {
    const lista = cards();
    const idx = lista.indexOf(evento.target);
    if (idx >= 0) {
      indiceFoco = idx;
      sincronizar(false);
    }
  });

  return () => {
    containerGrade.removeEventListener('keydown', onKeyDown);
  };
}
