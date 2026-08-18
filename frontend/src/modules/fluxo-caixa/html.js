export function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatarMoeda(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return '—';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor));
}

export function rotuloTipo(tipo) {
  return tipo === 'saida' ? 'Saída' : 'Entrada';
}

export function rotuloOrigem(geradoAuto) {
  return Number(geradoAuto) === 1 ? 'Automático' : 'Manual';
}

export function dataHoje(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}
