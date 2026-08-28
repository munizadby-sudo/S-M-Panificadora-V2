import { dinheiro } from '../../products/domain/Produto.js';

/**
 * Value object calculado (puro):
 * líquido = salário + HE − faltas − não cumprimento − adiantamentos.
 * Não calcula encargos trabalhistas.
 */
export function calcularFolha({
  salarioBase = 0,
  totalAdiantamentos = 0,
  totalFaltas = 0,
  totalHorasExtras = 0,
  totalNaoCumprimento = 0,
} = {}) {
  const salario_base = dinheiro(salarioBase);
  const total_adiantamentos = dinheiro(totalAdiantamentos);
  const total_faltas = dinheiro(totalFaltas);
  const total_horas_extras = dinheiro(totalHorasExtras);
  const total_nao_cumprimento = dinheiro(totalNaoCumprimento);
  const valor_liquido = dinheiro(
    salario_base +
      total_horas_extras -
      total_faltas -
      total_nao_cumprimento -
      total_adiantamentos,
  );

  return {
    salario_base,
    total_adiantamentos,
    total_faltas,
    total_horas_extras,
    total_nao_cumprimento,
    valor_liquido,
  };
}
