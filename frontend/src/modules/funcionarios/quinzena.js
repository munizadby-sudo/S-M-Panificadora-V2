const CARGOS_QUINZENAIS = new Set([
  'padeiro',
  'padeira',
  'padeiros',
  'padeiras',
  'ajudante',
  'ajudantes',
]);

export function cargoSugereQuinzena(cargo) {
  const chave = String(cargo ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return CARGOS_QUINZENAIS.has(chave);
}

export function funcionarioEhQuinzenal(funcionario) {
  if (!funcionario) return false;
  if (funcionario.periodicidade) return funcionario.periodicidade === 'quinzenal';
  return cargoSugereQuinzena(funcionario.cargo);
}

export function salarioQuinzena(salarioBase) {
  return Math.round((Number(salarioBase) || 0) * 50) / 100;
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

/** Próxima 1ª quinzena vigente: se o dia 5 já passou, usa 16–fim do mês corrente (paga dia 5 do mês seguinte). */
export function periodoPagaDia5Vigente(referenciaIso) {
  const { d } = partes(referenciaIso);
  if (d <= 5) return periodoPagaDia5(referenciaIso);
  return periodoPagaDia5(inicioProximoMes(referenciaIso));
}

/** Próxima 2ª quinzena vigente: se o dia 20 já passou, usa 1–15 do mês seguinte. */
export function periodoPagaDia20Vigente(referenciaIso) {
  const { d } = partes(referenciaIso);
  if (d <= 20) return periodoPagaDia20(referenciaIso);
  return periodoPagaDia20(inicioProximoMes(referenciaIso));
}

/**
 * Quinzena a fechar agora:
 * até dia 5 → 1ª quinzena (16–fim do mês anterior, paga dia 5);
 * até dia 20 → 2ª quinzena (1–15, paga dia 20);
 * depois do dia 20 → 1ª quinzena seguinte (16–fim do mês corrente, paga dia 5 do mês seguinte).
 */
export function quinzenaSugerida(referenciaIso) {
  const { d } = partes(referenciaIso);
  if (d <= 5) return periodoPagaDia5(referenciaIso);
  if (d <= 20) return periodoPagaDia20(referenciaIso);
  return periodoPagaDia5(inicioProximoMes(referenciaIso));
}

/** Folha mensal (balconista etc.): o pagamento é do mês anterior. */
export function periodoMesAnterior(referenciaIso) {
  const { y, m } = partes(referenciaIso);
  const anterior = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return {
    inicio: iso(anterior.y, anterior.m, 1),
    fim: iso(anterior.y, anterior.m, ultimoDia(anterior.y, anterior.m)),
  };
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
