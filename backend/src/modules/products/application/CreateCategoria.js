import { Categoria } from '../domain/Categoria.js';
import { CategoriaJaExisteError } from '../domain/erros.js';

export class CreateCategoria {
  constructor({ categoriaRepository, auditor }) {
    this.categoriaRepository = categoriaRepository;
    this.auditor = auditor;
  }

  async executar({ nome }, executor, ip = null) {
    const categoria = new Categoria({ nome, ativo: true });
    if (await this.categoriaRepository.existeNomeAtivo(categoria.nome)) {
      throw new CategoriaJaExisteError();
    }

    let salva;
    try {
      salva = await this.categoriaRepository.salvar(categoria);
    } catch (erro) {
      if (ehDuplicidade(erro)) {
        throw new CategoriaJaExisteError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_categoria',
        entidade: 'categoria',
        entidadeId: salva.id,
        estadoDepois: { nome: salva.nome },
        ip,
      });
    }

    return salva;
  }
}

function ehDuplicidade(erro) {
  return Number(erro?.errno) === 1062 || /Duplicate entry/i.test(String(erro?.message || ''));
}
