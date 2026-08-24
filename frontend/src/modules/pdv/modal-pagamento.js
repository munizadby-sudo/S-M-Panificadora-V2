let overlayModal;
let modalAberto = false;
let listenerEscape;
let aoFecharCallback;

export function modalPagamentoEstaAberto() {
  return modalAberto;
}

export function garantirModalPagamentoDom() {
  const doc = globalThis.document;
  if (!doc?.createElement) {
    return null;
  }

  const existente =
    typeof doc.getElementById === 'function' ? doc.getElementById('modal-pdv-pagamento') : null;
  if (existente) {
    overlayModal = existente;
    return overlayModal;
  }

  overlayModal = doc.createElement('div');
  overlayModal.id = 'modal-pdv-pagamento';
  overlayModal.className = 'caixa-turno-modal pdv-modal-pagamento';
  overlayModal.setAttribute('role', 'dialog');
  overlayModal.setAttribute('aria-modal', 'true');
  overlayModal.setAttribute('aria-labelledby', 'titulo-modal-pdv-pagamento');
  overlayModal.hidden = true;
  overlayModal.innerHTML = `
    <div class="caixa-turno-modal-caixa pdv-modal-pagamento-caixa">
      <h2 id="titulo-modal-pdv-pagamento" class="pdv-modal-titulo">Finalizar venda</h2>
      <div id="pdv-pagamento-conteudo-modal"></div>
      <button type="button" class="caixa-turno-modal-fechar" id="btn-fechar-modal-pdv-pagamento" aria-label="Fechar">×</button>
    </div>
  `;
  overlayModal.addEventListener('click', (evento) => {
    if (evento.target === overlayModal) {
      fecharModalPagamento();
      return;
    }
    if (evento.target?.closest?.('#btn-fechar-modal-pdv-pagamento')) {
      evento.preventDefault();
      evento.stopPropagation();
      fecharModalPagamento();
    }
  });
  doc.body.appendChild(overlayModal);
  return overlayModal;
}

/**
 * @param {{ renderizarConteudo?: (el: HTMLElement) => void, aoFechar?: () => void }} [opcoes]
 */
export function abrirModalPagamento({ renderizarConteudo, aoFechar } = {}) {
  garantirModalPagamentoDom();
  if (!overlayModal) {
    return;
  }

  aoFecharCallback = typeof aoFechar === 'function' ? aoFechar : undefined;

  if (!modalAberto) {
    modalAberto = true;
    overlayModal.hidden = false;
    listenerEscape = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        fecharModalPagamento();
      }
    };
    globalThis.document?.addEventListener?.('keydown', listenerEscape);
  }

  const conteudo = overlayModal.querySelector('#pdv-pagamento-conteudo-modal');
  if (conteudo && typeof renderizarConteudo === 'function') {
    renderizarConteudo(conteudo);
  }
}

/** Sempre fecha — sem trava (diferente do modal de Caixa). */
export function fecharModalPagamento() {
  if (!modalAberto) {
    return;
  }
  modalAberto = false;
  if (overlayModal) {
    overlayModal.hidden = true;
    const conteudo = overlayModal.querySelector('#pdv-pagamento-conteudo-modal');
    if (conteudo) {
      conteudo.innerHTML = '';
    }
  }
  if (listenerEscape) {
    globalThis.document?.removeEventListener?.('keydown', listenerEscape);
    listenerEscape = undefined;
  }
  const cb = aoFecharCallback;
  aoFecharCallback = undefined;
  cb?.();
}
