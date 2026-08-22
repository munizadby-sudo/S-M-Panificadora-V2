export const STATUS_ENCOMENDA = Object.freeze([
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'pronto', rotulo: 'Pronto' },
  { valor: 'entregue', rotulo: 'Entregue' },
]);

export function rotuloStatus(valor) {
  return STATUS_ENCOMENDA.find((item) => item.valor === valor)?.rotulo || String(valor ?? '');
}

export function htmlOpcoesStatus(valorSelecionado = 'pendente') {
  return STATUS_ENCOMENDA.map(
    (item) =>
      `<option value="${item.valor}"${item.valor === valorSelecionado ? ' selected' : ''}>${item.rotulo}</option>`,
  ).join('');
}
