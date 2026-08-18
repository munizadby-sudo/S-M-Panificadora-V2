import { CategoriaJaExisteError, CategoriaNaoEncontradaError } from '../domain/erros.js';

export class ReactivateCategoria {
  constructor({ categoriaRepository, auditor }) {
    this.categoriaRepository = categoriaRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const categoria = await this.categoriaRepository.buscarPorId(Number(id));
    if (!categoria) {
      throw new CategoriaNaoEncontradaError();
    }
    if (categoria.ativo) {
      return categoria;
    }

    if (await this.categoriaRepository.existeNomeAtivo(categoria.nome, categoria.id)) {
      throw new CategoriaJaExisteError();
    }

    categoria.reativar();
    let salva;
    try {
      salva = await this.categoriaRepository.atualizar(categoria);
    } catch (erro) {
      if (erro instanceof CategoriaJaExisteError || Number(erro?.errno) === 1062) {
        throw new CategoriaJaExisteError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'reativar_categoria',
        entidade: 'categoria',
        entidadeId: salva.id,
        estadoDepois: { ativo: 1 },
        ip,
      });
    }

    return salva;
  }
}
