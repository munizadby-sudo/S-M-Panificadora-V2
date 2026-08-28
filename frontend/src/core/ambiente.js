const PORTA_FRONTEND_DEV = '4173';
const URL_API_DEV = 'http://127.0.0.1:3001/api';
const URL_API_PROD = '/api';

export function obterUrlBaseDaApi(location = globalThis.location) {
  const injetada = globalThis.__SM_API_BASE;
  if (typeof injetada === 'string' && injetada.trim()) {
    return injetada.replace(/\/$/, '');
  }

  const host = location?.hostname;
  const porta = String(location?.port ?? '');
  const ehLocal = host === '127.0.0.1' || host === 'localhost';

  if (ehLocal && porta === PORTA_FRONTEND_DEV) {
    return URL_API_DEV;
  }

  return URL_API_PROD;
}
