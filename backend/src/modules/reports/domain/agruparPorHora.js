import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';

/**
 * Agrupa itens confirmados por hora civil (0–23).
 * Preenche com zero só entre a hora mínima e máxima presentes nos dados.
 */
export function agruparPorHora(itens = []) {
  const lista = Array.isArray(itens) ? itens : [];
  if (lista.length === 0) {
    return [];
  }

  const porHora = new Map();
  for (const item of lista) {
    const hora = Number(item.horaOperacao);
    if (!Number.isInteger(hora) || hora < 0 || hora > 23) {
      continue;
    }
    const atual = porHora.get(hora) || { hora, quantidade: 0, receita: 0 };
    atual.quantidade += Number(item.quantidade) || 0;
    atual.receita = dinheiro(atual.receita + Number(item.subtotal || 0));
    porHora.set(hora, atual);
  }

  if (porHora.size === 0) {
    return [];
  }

  const horas = [...porHora.keys()];
  const horaMin = Math.min(...horas);
  const horaMax = Math.max(...horas);
  const resultado = [];

  for (let hora = horaMin; hora <= horaMax; hora += 1) {
    const atual = porHora.get(hora);
    resultado.push({
      hora,
      quantidade: atual ? atual.quantidade : 0,
      receita: atual ? dinheiro(atual.receita) : 0,
    });
  }

  return resultado;
}
