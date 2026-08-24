import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';

/**
 * Classifica itens por receita (já agregados) em A/B/C.
 * A: percentual acumulado ≤ 80%; B: ≤ 95%; C: acima de 95%.
 * O produto que cruza o limiar de 80% entra em B, nunca em A.
 */
export function classificarCurvaABC(itens = []) {
  const lista = Array.isArray(itens) ? [...itens] : [];
  if (lista.length === 0) {
    return [];
  }

  lista.sort((a, b) => {
    const diff = Number(b.receita) - Number(a.receita);
    if (diff !== 0) {
      return diff;
    }
    return String(a.produto || '').localeCompare(String(b.produto || ''), 'pt-BR');
  });

  const totalReceita = lista.reduce((soma, item) => soma + Number(item.receita || 0), 0);
  let acumulado = 0;

  return lista.map((item) => {
    acumulado = dinheiro(acumulado + Number(item.receita || 0));
    const percentualAcumulado =
      totalReceita === 0 ? 0 : Math.round((acumulado / totalReceita) * 1000) / 10;

    let classe = 'C';
    if (percentualAcumulado <= 80) {
      classe = 'A';
    } else if (percentualAcumulado <= 95) {
      classe = 'B';
    }

    return {
      produto: item.produto,
      quantidade: Number(item.quantidade) || 0,
      receita: dinheiro(item.receita),
      percentual_acumulado: percentualAcumulado,
      classe,
    };
  });
}
