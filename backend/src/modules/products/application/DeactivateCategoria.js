import { CategoriaNaoEncontradaError } from '../domain/erros.js';

export class DeactivateCategoria {
  constructor({ categoriaRepository, auditor }) {
    this.categoriaRepository = categoriaRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const categoria = await this.categoriaRepository.buscarPorId(Number(id));
    if (!categoria) {
      throw new CategoriaNaoEncontradaError();
    }
    if (!categoria.ativo) {
      return categoria;
    }

    categoria.desativar();
    const salva = await this.categoriaRepository.atualizar(categoria);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'desativar_categoria',
        entidade: 'categoria',
        entidadeId: salva.id,
        estadoDepois: { ativo: 0 },
        ip,
      });
    }

    return salva;
  }
}
