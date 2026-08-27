import { calcularTroco } from '../pdv/pagamento.js';
import { dinheiroItem } from './itens.js';

export function sugerirSinalMetade(total) {
  return dinheiroItem(Number(total) / 2);
}

export function aplicarSinalDoFormulario({
  total,
  sinalAtual,
  pagaDepois,
  sinalEditadoNaMao,
} = {}) {
  if (pagaDepois) {
    return '0';
  }
  if (sinalEditadoNaMao) {
    return sinalAtual === '' || sinalAtual == null ? '' : String(sinalAtual);
  }
  return String(sugerirSinalMetade(total));
}

export function podeConfirmarPagamento({ valorACobrar, forma, recebido = '' } = {}) {
  const valor = Number(valorACobrar) || 0;
  if (valor <= 0) {
    return true;
  }
  if (!forma) {
    return false;
  }
  if (forma === 'dinheiro') {
    const n = Number(recebido);
    return Number.isFinite(n) && n >= valor;
  }
  return true;
}

export function textoTroco(recebido, valorACobrar) {
  const n = Number(recebido);
  const valor = Number(valorACobrar) || 0;
  if (!Number.isFinite(n) || n < valor) {
    return null;
  }
  return calcularTroco(recebido, valor);
}
