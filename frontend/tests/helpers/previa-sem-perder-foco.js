import assert from 'node:assert/strict';

export function criarInputComFoco(valorInicial = '') {
  let focado = false;
  const input = {
    value: valorInicial,
    listeners: {},
    addEventListener(tipo, fn) {
      this.listeners[tipo] = fn;
    },
    focus() {
      focado = true;
    },
    blur() {
      focado = false;
    },
    estaFocado() {
      return focado;
    },
    digitar(texto) {
      this.value = texto;
      this.listeners.input?.({ target: this });
    },
  };
  input.focus();
  return input;
}

export function simularDigitacaoComFoco(input, caracteres, atualizar) {
  let valor = '';
  for (const char of caracteres) {
    valor += char;
    input.digitar(valor);
    atualizar(valor);
    assert.equal(
      input.estaFocado(),
      true,
      `campo perdeu o foco após digitar "${valor}"`,
    );
  }
  return valor;
}
