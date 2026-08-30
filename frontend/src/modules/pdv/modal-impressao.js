let overlayModal;
let modalAberto = false;
let listenerEscape;
let htmlAtual = '';
let imprimirAtual;

export function modalImpressaoEstaAberto() {
  return modalAberto;
}

export function garantirModalImpressaoDom() {
  const doc = globalThis.document;
  if (!doc?.createElement) {
    return null;
  }

  const existente =
    typeof doc.getElementById === 'function' ? doc.getElementById('modal-pdv-impressao') : null;
  if (existente) {
    overlayModal = existente;
    return overlayModal;
  }

  overlayModal = doc.createElement('div');
  overlayModal.id = 'modal-pdv-impressao';
  overlayModal.className = 'caixa-turno-modal pdv-modal-impressao';
  overlayModal.setAttribute('role', 'dialog');
  overlayModal.setAttribute('aria-modal', 'true');
  overlayModal.setAttribute('aria-labelledby', 'titulo-modal-pdv-impressao');
  overlayModal.hidden = true;
  overlayModal.innerHTML = `
    <div class="caixa-turno-modal-caixa pdv-modal-impressao-caixa">
      <h2 id="titulo-modal-pdv-impressao" class="pdv-modal-titulo">Imprimir cupom</h2>
      <iframe id="pdv-impressao-previa" class="pdv-impressao-previa" title="Prévia do cupom"></iframe>
      <p id="pdv-impressao-erro" class="pdv-erro" role="alert"></p>
      <div class="pdv-impressao-acoes">
        <button type="button" id="btn-imprimir-cupom">Imprimir</button>
        <button type="button" id="btn-fechar-impressao">Fechar</button>
      </div>
      <button type="button" class="caixa-turno-modal-fechar" id="btn-fechar-modal-pdv-impressao" aria-label="Fechar">×</button>
    </div>
  `;
  overlayModal.addEventListener('click', (evento) => {
    if (evento.target === overlayModal) {
      fecharModalImpressao();
      return;
    }
    if (evento.target?.closest?.('#btn-fechar-modal-pdv-impressao, #btn-fechar-impressao')) {
      evento.preventDefault();
      evento.stopPropagation();
      fecharModalImpressao();
    }
    if (evento.target?.closest?.('#btn-imprimir-cupom')) {
      evento.preventDefault();
      void imprimirDoModal();
    }
  });
  doc.body.appendChild(overlayModal);
  return overlayModal;
}

export function abrirModalImpressaoCupom({ html, imprimir, titulo } = {}) {
  garantirModalImpressaoDom();
  if (!overlayModal) {
    return;
  }

  htmlAtual = String(html ?? '');
  imprimirAtual = typeof imprimir === 'function' ? imprimir : undefined;
  const tituloEl = overlayModal.querySelector('#titulo-modal-pdv-impressao');
  if (tituloEl) {
    tituloEl.textContent = titulo || 'Imprimir cupom';
  }

  const previa = overlayModal.querySelector('#pdv-impressao-previa');
  if (previa) {
    previa.srcdoc = htmlAtual;
  }
  const erro = overlayModal.querySelector('#pdv-impressao-erro');
  if (erro) {
    erro.textContent = '';
  }

  if (modalAberto) {
    return;
  }
  modalAberto = true;
  overlayModal.hidden = false;
  listenerEscape = (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fecharModalImpressao();
    }
    if (evento.key === 'Enter') {
      evento.preventDefault();
      void imprimirDoModal();
    }
  };
  globalThis.document?.addEventListener?.('keydown', listenerEscape);
}

export function fecharModalImpressao() {
  if (!modalAberto) {
    return;
  }
  modalAberto = false;
  htmlAtual = '';
  imprimirAtual = undefined;
  if (overlayModal) {
    overlayModal.hidden = true;
    const previa = overlayModal.querySelector('#pdv-impressao-previa');
    if (previa) {
      previa.srcdoc = '';
    }
  }
  if (listenerEscape) {
    globalThis.document?.removeEventListener?.('keydown', listenerEscape);
    listenerEscape = undefined;
  }
}

async function imprimirDoModal() {
  const erro = overlayModal?.querySelector('#pdv-impressao-erro');
  if (erro) {
    erro.textContent = '';
  }
  if (!htmlAtual || typeof imprimirAtual !== 'function') {
    return;
  }
  try {
    await imprimirAtual(htmlAtual);
    fecharModalImpressao();
  } catch {
    if (erro) {
      erro.textContent = 'Não foi possível imprimir. Tente de novo.';
    }
  }
}
