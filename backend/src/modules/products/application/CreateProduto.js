import { Produto } from '../domain/Produto.js';
import {
  CategoriaNaoEncontradaError,
  NomeDuplicadoNaCategoriaError,
} from '../domain/erros.js';

export class CreateProduto {
  constructor({ produtoRepository, categoriaRepository, auditor }) {
    this.produtoRepository = produtoRepository;
    this.categoriaRepository = categoriaRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const categoria = await this.categoriaRepository.buscarPorId(Number(entrada.categoria_id));
    if (!categoria || !categoria.ativo) {
      throw new CategoriaNaoEncontradaError();
    }

    const produto = new Produto({
      nome: entrada.nome,
      categoriaId: categoria.id,
      icone: entrada.icone,
      preco: entrada.preco,
      custo: entrada.custo,
      ativo: true,
    });

    if (await this.produtoRepository.existeNomeNaCategoria(produto.categoriaId, produto.nome)) {
      throw new NomeDuplicadoNaCategoriaError();
    }

    let salvo;
    try {
      salvo = await this.produtoRepository.salvar(produto);
    } catch (erro) {
      if (erro instanceof NomeDuplicadoNaCategoriaError || ehDuplicidade(erro)) {
        throw new NomeDuplicadoNaCategoriaError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_produto',
        entidade: 'produto',
        entidadeId: salvo.id,
        estadoDepois: { nome: salvo.nome, categoria_id: salvo.categoriaId },
        ip,
      });
    }

    return salvo;
  }
}

function ehDuplicidade(erro) {
  return Number(erro?.errno) === 1062 || /Duplicate entry/i.test(String(erro?.message || ''));
}
