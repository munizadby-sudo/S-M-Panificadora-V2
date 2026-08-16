import { getTurnoAtual, onMudancaDeTurno } from './estado.js';

export function textoDoBanner(status) {
  if (!status?.aberto || !status.turno) {
    return 'Caixa fechado';
  }
  const periodo = status.turno.periodo === 'manha' ? 'manhã' : 'tarde';
  return `Caixa aberto — ${periodo}`;
}

export function renderizarBanner(elemento, status) {
  if (!elemento) {
    return;
  }
  const aberto = Boolean(status?.aberto);
  elemento.textContent = textoDoBanner(status);
  elemento.dataset.aberto = aberto ? 'true' : 'false';
}

export async function montarBanner(elemento) {
  const status = await getTurnoAtual({ forcar: true });
  renderizarBanner(elemento, status);
  return onMudancaDeTurno((proximo) => renderizarBanner(elemento, proximo));
}
