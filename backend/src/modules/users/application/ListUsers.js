export class ListUsers {
  constructor({ usuarioRepository }) {
    this.usuarioRepository = usuarioRepository;
  }

  async executar({ page = 1, limit = 20 } = {}) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const { data, total } = await this.usuarioRepository.listar(pagina, limite);
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
