export class ListFuncionarios {
  constructor({ funcionarioRepository }) {
    this.funcionarioRepository = funcionarioRepository;
  }

  async executar({ busca, ativo, page = 1, limit = 20 } = {}) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const filtros = { page: pagina, limit: limite };

    if (ativo !== undefined && ativo !== null && ativo !== '') {
      filtros.ativo = Number(ativo) === 1 || ativo === true || ativo === 'true';
    }
    if (busca !== undefined && busca !== null && String(busca).trim()) {
      filtros.busca = String(busca).trim();
    }

    const { data, total } = await this.funcionarioRepository.listar(filtros);
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
