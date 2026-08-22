export class ListEncomendas {
  constructor({ encomendaRepository }) {
    this.encomendaRepository = encomendaRepository;
  }

  async executar({
    status,
    cliente_id,
    data_entrega_inicio,
    data_entrega_fim,
    ativo,
    page = 1,
    limit = 20,
  } = {}) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const filtros = { page: pagina, limit: limite };

    if (status !== undefined && status !== null && String(status).trim()) {
      filtros.status = String(status).trim().toLowerCase();
    }
    if (cliente_id !== undefined && cliente_id !== null && cliente_id !== '') {
      filtros.clienteId = Number(cliente_id);
    }
    if (data_entrega_inicio !== undefined && data_entrega_inicio !== null && String(data_entrega_inicio).trim()) {
      filtros.dataEntregaInicio = String(data_entrega_inicio).trim();
    }
    if (data_entrega_fim !== undefined && data_entrega_fim !== null && String(data_entrega_fim).trim()) {
      filtros.dataEntregaFim = String(data_entrega_fim).trim();
    }
    if (ativo === undefined || ativo === null || ativo === '') {
      filtros.ativo = true;
    } else {
      filtros.ativo = Number(ativo) === 1 || ativo === true || ativo === 'true';
    }

    const { data, total } = await this.encomendaRepository.listar(filtros);
    const pages = Math.max(1, Math.ceil(total / limite) || 1);

    return {
      data,
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
