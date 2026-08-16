function criarLocalStorageMemoria() {
  const dados = new Map();
  return {
    getItem(chave) {
      return dados.has(chave) ? dados.get(chave) : null;
    },
    setItem(chave, valor) {
      dados.set(chave, String(valor));
    },
    removeItem(chave) {
      dados.delete(chave);
    },
    clear() {
      dados.clear();
    },
  };
}

export function criarLocalizacao(hrefInicial = 'http://127.0.0.1:4173/index.html') {
  const url = new URL(hrefInicial);
  return {
    href: url.href,
    pathname: url.pathname,
    origin: url.origin,
    replaceCount: 0,
    replace(destino) {
      this.replaceCount += 1;
      const proxima = new URL(destino, this.href);
      this.href = proxima.href;
      this.pathname = proxima.pathname;
      this.origin = proxima.origin;
    },
  };
}

export function criarDocumentoMinimo() {
  return {
    createElement(tag) {
      const classes = new Set();
      const el = {
        tagName: String(tag).toUpperCase(),
        type: '',
        dataset: {},
        textContent: '',
        className: '',
        children: [],
        listeners: {},
        classList: {
          toggle(nome, ativo) {
            if (ativo) {
              classes.add(nome);
            } else {
              classes.delete(nome);
            }
            el.className = [...classes].join(' ');
          },
        },
        addEventListener(evento, fn) {
          el.listeners[evento] = fn;
        },
        appendChild(filho) {
          el.children.push(filho);
        },
        prepend(filho) {
          el.children.unshift(filho);
        },
      };
      return el;
    },
  };
}

export function criarContainer() {
  const container = {
    _html: '',
    children: [],
    get innerHTML() {
      return container._html;
    },
    set innerHTML(valor) {
      container._html = valor;
      if (valor === '') {
        container.children = [];
      }
    },
    appendChild(filho) {
      container.children.push(filho);
    },
    querySelectorAll() {
      return container.children;
    },
  };
  return container;
}

export function instalarAmbienteDeTeste({ href } = {}) {
  globalThis.localStorage = criarLocalStorageMemoria();
  globalThis.location = criarLocalizacao(href);
  globalThis.document = criarDocumentoMinimo();
  globalThis.window = globalThis;
  return globalThis.location;
}
