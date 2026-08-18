export function htmlAvisoCaixaFechado() {
  return `<aside id="aviso-caixa-fechado" class="pdv-aviso-fechado" role="status">
    <p>Abra o caixa para começar a vender</p>
    <button type="button" id="btn-ir-para-caixa">Ir para Caixa</button>
  </aside>`;
}

export function irParaTelaDeCaixa(raiz = globalThis.document) {
  const botao = raiz?.querySelector?.('[data-modulo-id="caixa-turno"]');
  botao?.click?.();
}
