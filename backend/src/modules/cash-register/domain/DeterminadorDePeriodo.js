const FUSO = 'America/Recife';

export function determinarPeriodo(agora = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: FUSO,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(agora),
  );
  return hora < 14 ? 'manha' : 'tarde';
}

export function dataHoje(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}
