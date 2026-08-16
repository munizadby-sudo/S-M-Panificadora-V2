import { apiGet } from '../../core/api.js';

const CAMINHO_STATUS = '/caixa-turno/status';

let cache = null;
const ouvintes = new Set();

export async function getTurnoAtual({ forcar = false } = {}) {
  if (!forcar && cache) {
    return cache;
  }

  cache = await apiGet(CAMINHO_STATUS);
  notificar();
  return cache;
}

export function turnoEstaAberto() {
  return Boolean(cache?.aberto);
}

export function obterTurnoId() {
  return cache?.turno?.id ?? null;
}

export function onMudancaDeTurno(callback) {
  ouvintes.add(callback);
  return () => {
    ouvintes.delete(callback);
  };
}

export function invalidarCacheTurno() {
  cache = null;
}

function notificar() {
  for (const ouvinte of ouvintes) {
    ouvinte(cache);
  }
}
