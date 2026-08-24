export class ListFolhas {
  constructor({ folhaPagamentoRepository }) {
    this.folhaPagamentoRepository = folhaPagamentoRepository;
  }

  async executar({
    funcionario_id,
    status,
    periodo_inicio,
    periodo_fim,
    page = 1,
    limit = 20,
  } = {}) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const filtros = { page: pagina, limit: limite };

    if (funcionario_id !== undefined && funcionario_id !== null && funcionario_id !== '') {
      filtros.funcionarioId = Number(funcionario_id);
    }
    if (status !== undefined && status !== null && String(status).trim()) {
      filtros.status = String(status).trim().toLowerCase();
    }
    if (periodo_inicio) {
      filtros.periodoInicio = String(periodo_inicio).slice(0, 10);
    }
    if (periodo_fim) {
      filtros.periodoFim = String(periodo_fim).slice(0, 10);
    }

    const { data, total } = await this.folhaPagamentoRepository.listar(filtros);
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
