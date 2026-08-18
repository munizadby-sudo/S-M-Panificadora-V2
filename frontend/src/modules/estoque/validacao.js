export function parseDecimal(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return NaN;
  }
  return Number(String(valor).trim().replace(',', '.'));
}

export function validarLancamentoEstoque({ inicial, produzido, minimo } = {}) {
  const erros = {};
  const inicialNum = parseDecimal(inicial);
  if (Number.isNaN(inicialNum) || inicialNum < 0) {
    erros.inicial = 'Inicial não pode ser negativo.';
  }

  const produzidoNum = parseDecimal(produzido);
  if (Number.isNaN(produzidoNum) || produzidoNum < 0) {
    erros.produzido = 'Produzido não pode ser negativo.';
  }

  const minimoVazio = minimo === undefined || minimo === null || String(minimo).trim() === '';
  const minimoNum = minimoVazio ? null : parseDecimal(minimo);
  if (!minimoVazio && (Number.isNaN(minimoNum) || minimoNum < 0)) {
    erros.minimo = 'Mínimo não pode ser negativo.';
  }

  return {
    ok: Object.keys(erros).length === 0,
    erros,
    valores: {
      inicial: inicialNum,
      produzido: produzidoNum,
      minimo: minimoNum,
    },
  };
}
