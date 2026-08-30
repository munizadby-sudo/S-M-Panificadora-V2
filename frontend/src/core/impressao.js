/**
 * Imprime HTML no mesmo documento, sem abrir aba do Chrome.
 * Iframe fora da tela (80mm) para o cupom térmico montar o layout.
 */
export async function imprimirHtmlEmIframe(html, doc = globalThis.document) {
  const corpo = doc?.body;
  if (!doc?.createElement || !corpo?.appendChild) {
    throw new Error('Impressão indisponível');
  }

  const iframe = doc.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Impressão');
  if (iframe.style) {
    iframe.style.cssText = 'position:absolute;width:80mm;height:1px;left:-9999px;border:0;';
  }
  corpo.appendChild(iframe);

  const janela = iframe.contentWindow;
  const destino = iframe.contentDocument || janela?.document;
  if (!janela || !destino) {
    removerIframe(iframe);
    throw new Error('Não foi possível preparar a impressão');
  }

  destino.open();
  destino.write(String(html ?? ''));
  destino.close();

  await new Promise((resolve, reject) => {
    let finalizou = false;
    const terminar = (erro) => {
      if (finalizou) {
        return;
      }
      finalizou = true;
      removerIframe(iframe);
      if (erro) {
        reject(erro);
        return;
      }
      resolve();
    };

    const disparar = () => {
      if (typeof janela.print !== 'function') {
        terminar(new Error('Impressão indisponível'));
        return;
      }
      const depois = () => {
        janela.removeEventListener?.('afterprint', depois);
        terminar();
      };
      if (typeof janela.addEventListener === 'function') {
        janela.addEventListener('afterprint', depois);
      }
      try {
        janela.focus?.();
        janela.print();
      } catch (erro) {
        terminar(erro);
        return;
      }
      if (typeof janela.addEventListener !== 'function') {
        terminar();
      }
    };

    disparar();
  });
}

function removerIframe(iframe) {
  iframe?.parentNode?.removeChild?.(iframe);
}
