import { apiGet, ApiError } from '../../core/api.js';

export async function buscarRelatorioVendas({ data_inicio, data_fim }) {
  return apiGet('/relatorios/vendas', { data_inicio, data_fim });
}

export async function buscarRelatorioFechamentoCaixa({ data_inicio, data_fim }) {
  return apiGet('/relatorios/fechamento-caixa', { data_inicio, data_fim });
}

export async function buscarCurvaAbc({ data_inicio, data_fim }) {
  return apiGet('/relatorios/curva-abc', { data_inicio, data_fim });
}

export async function buscarRelatorioResultado({ data_inicio, data_fim }) {
  return apiGet('/relatorios/resultado', { data_inicio, data_fim });
}

export async function buscarVendasPorHora({ data_inicio, data_fim }) {
  return apiGet('/relatorios/vendas-por-hora', { data_inicio, data_fim });
}

export function mensagemErroRelatorio(erro) {
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message || 'Não foi possível carregar o relatório.';
  }
  return erro?.mensagem || erro?.message || 'Não foi possível carregar o relatório.';
}
