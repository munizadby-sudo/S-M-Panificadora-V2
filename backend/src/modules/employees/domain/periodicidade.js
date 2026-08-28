import { dinheiro } from '../../products/domain/Produto.js';
import { PeriodicidadeInvalidaError } from './erros.js';

export const PERIODICIDADE_MENSAL = 'mensal';
export const PERIODICIDADE_QUINZENAL = 'quinzenal';

const CARGOS_QUINZENAIS = new Set(['padeiro', 'padeira', 'padeiros', 'padeiras', 'ajudante', 'ajudantes']);

export function cargoSugereQuinzena(cargo) {
  const chave = String(cargo ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return CARGOS_QUINZENAIS.has(chave);
}

export function normalizarPeriodicidade(valor, { cargo } = {}) {
  if (valor == null || String(valor).trim() === '') {
    return cargoSugereQuinzena(cargo) ? PERIODICIDADE_QUINZENAL : PERIODICIDADE_MENSAL;
  }
  const normalizado = String(valor).trim().toLowerCase();
  if (normalizado !== PERIODICIDADE_MENSAL && normalizado !== PERIODICIDADE_QUINZENAL) {
    throw new PeriodicidadeInvalidaError();
  }
  return normalizado;
}

export function salarioDoPeriodo(salarioBase, periodicidade) {
  const salario = dinheiro(salarioBase);
  if (periodicidade === PERIODICIDADE_QUINZENAL) {
    return dinheiro(salario / 2);
  }
  return salario;
}

export function periodoPagaDia5(referenciaIso) {
  const { y, m } = partes(referenciaIso);
  const anterior = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return {
    inicio: iso(anterior.y, anterior.m, 16),
    fim: iso(anterior.y, anterior.m, ultimoDia(anterior.y, anterior.m)),
    paga_em: iso(y, m, 5),
  };
}

export function periodoPagaDia20(referenciaIso) {
  const { y, m } = partes(referenciaIso);
  return {
    inicio: iso(y, m, 1),
    fim: iso(y, m, 15),
    paga_em: iso(y, m, 20),
  };
}

export function quinzenaSugerida(referenciaIso) {
  const { d } = partes(referenciaIso);
  if (d <= 5) return periodoPagaDia5(referenciaIso);
  if (d <= 20) return periodoPagaDia20(referenciaIso);
  return periodoPagaDia5(inicioProximoMes(referenciaIso));
}

function inicioProximoMes(referenciaIso) {
  const { y, m } = partes(referenciaIso);
  if (m === 12) return iso(y + 1, 1, 1);
  return iso(y, m + 1, 1);
}

function partes(isoData) {
  const [y, m, d] = String(isoData).slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

function iso(y, m, d) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function ultimoDia(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
