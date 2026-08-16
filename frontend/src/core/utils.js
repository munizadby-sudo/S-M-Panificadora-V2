export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
    .format(Number(valor))
    .replace(/\u00a0|\u202f/g, ' ');
}

export function formatarData(isoString) {
  const data = new Date(isoString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(data);
}

export function debounce(fn, atrasoMs) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      fn(...args);
    }, atrasoMs);
  };
}
