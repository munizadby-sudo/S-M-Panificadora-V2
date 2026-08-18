import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';

export class ListSales {
  constructor({ vendaRepository }) {
    this.vendaRepository = vendaRepository;
  }

  async executar({ turno_id, data_inicio, data_fim, status, page = 1, limit = 20 } = {}) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const filtros = {
      page: pagina,
      limit: limite,
    };

    if (turno_id !== undefined && turno_id !== null && turno_id !== '') {
      filtros.turnoId = Number(turno_id);
    }
    if (data_inicio !== undefined && data_inicio !== null && String(data_inicio).trim()) {
      filtros.dataInicio = normalizarData(data_inicio);
    }
    if (data_fim !== undefined && data_fim !== null && String(data_fim).trim()) {
      filtros.dataFim = normalizarData(data_fim);
    }
    if (status !== undefined && status !== null && String(status).trim()) {
      filtros.status = String(status).trim().toLowerCase();
    }

    const { data, total } = await this.vendaRepository.listar(filtros);
    const pages = Math.max(1, Math.ceil(total / limite) || 1);

    return {
      data: data.map((venda) => venda.paraListagem()),
      pagination: {
        page: pagina,
        limit: limite,
        total,
        pages,
        hasPrevious: pagina > 1,
        hasNext: pagina < pages && total > 0,
      },
    };
  }
}
