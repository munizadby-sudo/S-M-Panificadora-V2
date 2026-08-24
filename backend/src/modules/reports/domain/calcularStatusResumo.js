import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';

/**
 * Deriva o rótulo a partir do sinal da diferença já persistida (não recalcula).
 * Alinhado a FechamentoCaixa.classificarStatusResumo.
 */
export function calcularStatusResumo(diferencaTotal) {
  const valor = dinheiro(diferencaTotal);
  if (valor > 0) {
    return 'sobra';
  }
  if (valor < 0) {
    return 'falta';
  }
  return 'bateu certo';
}
