export const MOTIVOS_PERDA = Object.freeze([
  { valor: 'queimado', rotulo: 'Queimado' },
  { valor: 'vencido', rotulo: 'Vencido' },
  { valor: 'danificado', rotulo: 'Danificado' },
  { valor: 'sobra', rotulo: 'Sobra' },
]);

export function rotuloMotivo(valor) {
  return MOTIVOS_PERDA.find((item) => item.valor === valor)?.rotulo || String(valor ?? '');
}

export function htmlOpcoesMotivo(valorSelecionado = '') {
  const opcoes = MOTIVOS_PERDA.map(
    (item) =>
      `<option value="${item.valor}"${item.valor === valorSelecionado ? ' selected' : ''}>${item.rotulo}</option>`,
  ).join('');
  return opcoes;
}
