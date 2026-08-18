import { dataHoje, normalizarData } from '../domain/EstoqueDiario.js';

export class ListarEstoqueDoDia {
  constructor({ produtoRepository, obterOuCriarEstoqueDoDia }) {
    this.produtoRepository = produtoRepository;
    this.obterOuCriarEstoqueDoDia = obterOuCriarEstoqueDoDia;
  }

  async executar({ data, categoria_id, produto_id, busca, page = 1, limit = 20 } = {}) {
    const dia = data === undefined || data === null || data === '' ? dataHoje() : normalizarData(data);
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const { produtos, total } = await this.produtosDaPagina({
      categoria_id,
      produto_id,
      busca,
      pagina,
      limite,
    });

    const itens = [];
    for (const produto of produtos) {
      const estoque = await this.obterOuCriarEstoqueDoDia.executar({
        produtoId: produto.id,
        data: dia,
      });
      itens.push(estoque.paraPublico(produto.nome));
    }

    const pages = Math.max(1, Math.ceil(total / limite) || 1);
    return {
      data: itens,
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

  async produtosDaPagina({ categoria_id, produto_id, busca, pagina, limite }) {
    if (produto_id !== undefined && produto_id !== null && produto_id !== '') {
      const produto = await this.produtoRepository.buscarPorId(Number(produto_id));
      if (!produto) {
        return { produtos: [], total: 0 };
      }
      if (categoria_id !== undefined && categoria_id !== null && categoria_id !== '') {
        if (produto.categoriaId !== Number(categoria_id)) {
          return { produtos: [], total: 0 };
        }
      }
      if (busca !== undefined && busca !== null && String(busca).trim()) {
        const termo = String(busca).trim().toLowerCase();
        if (!produto.nome.toLowerCase().includes(termo)) {
          return { produtos: [], total: 0 };
        }
      }
      const inicio = (pagina - 1) * limite;
      return {
        produtos: inicio === 0 ? [produto] : [],
        total: 1,
      };
    }

    const filtros = { page: pagina, limit: limite };
    if (categoria_id !== undefined && categoria_id !== null && categoria_id !== '') {
      filtros.categoriaId = Number(categoria_id);
    }
    if (busca !== undefined && busca !== null && String(busca).trim()) {
      filtros.busca = String(busca).trim();
    }
    const { data, total } = await this.produtoRepository.listar(filtros);
    return { produtos: data, total };
  }
}
