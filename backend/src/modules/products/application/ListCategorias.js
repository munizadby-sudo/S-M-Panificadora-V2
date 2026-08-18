export class ListCategorias {
  constructor({ categoriaRepository }) {
    this.categoriaRepository = categoriaRepository;
  }

  async executar({ ativo } = {}) {
    const filtro = {};
    if (ativo !== undefined && ativo !== null && ativo !== '') {
      filtro.ativo = Number(ativo) === 1 || ativo === true || ativo === 'true';
    }
    return this.categoriaRepository.listar(filtro);
  }
}
