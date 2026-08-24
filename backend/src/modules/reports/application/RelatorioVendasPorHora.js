import { agruparPorHora } from '../domain/agruparPorHora.js';
import { validarPeriodo } from './validarPeriodo.js';

export class RelatorioVendasPorHora {
  constructor({ vendaRepository }) {
    this.vendaRepository = vendaRepository;
  }

  async executar({ data_inicio, data_fim } = {}) {
    const { dataInicio, dataFim } = validarPeriodo({ data_inicio, data_fim });
    const itens = await this.vendaRepository.listarItensConfirmadosNoPeriodo(dataInicio, dataFim);
    return { por_hora: agruparPorHora(itens) };
  }
}
