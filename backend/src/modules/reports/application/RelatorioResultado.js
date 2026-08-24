import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';
import { validarPeriodo } from './validarPeriodo.js';

export class RelatorioResultado {
  constructor({ lancamentoFluxoCaixaRepository }) {
    this.lancamentoFluxoCaixaRepository = lancamentoFluxoCaixaRepository;
  }

  async executar({ data_inicio, data_fim } = {}) {
    const { dataInicio, dataFim } = validarPeriodo({ data_inicio, data_fim });
    const lancamentos = await this.lancamentoFluxoCaixaRepository.listarAtivosNoPeriodo(
      dataInicio,
      dataFim,
    );

    let totalEntradas = 0;
    let totalSaidas = 0;
    const porCategoria = new Map();

    for (const lancamento of lancamentos) {
      const categoria = String(lancamento.categoria || '').trim() || 'sem_categoria';
      const valor = dinheiro(lancamento.valor);
      const atual = porCategoria.get(categoria) || { categoria, entradas: 0, saidas: 0 };

      if (lancamento.tipo === 'entrada') {
        totalEntradas = dinheiro(totalEntradas + valor);
        atual.entradas = dinheiro(atual.entradas + valor);
      } else if (lancamento.tipo === 'saida') {
        totalSaidas = dinheiro(totalSaidas + valor);
        atual.saidas = dinheiro(atual.saidas + valor);
      }

      porCategoria.set(categoria, atual);
    }

    return {
      total_entradas: totalEntradas,
      total_saidas: totalSaidas,
      resultado: dinheiro(totalEntradas - totalSaidas),
      por_categoria: [...porCategoria.values()].sort((a, b) =>
        a.categoria.localeCompare(b.categoria, 'pt-BR'),
      ),
    };
  }
}
