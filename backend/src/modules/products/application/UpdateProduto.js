import { Produto } from '../domain/Produto.js';
import {
  CategoriaNaoEncontradaError,
  NomeDuplicadoNaCategoriaError,
  ProdutoNaoEncontradoError,
} from '../domain/erros.js';

export class UpdateProduto {
  constructor({ produtoRepository, categoriaRepository, auditor }) {
    this.produtoRepository = produtoRepository;
    this.categoriaRepository = categoriaRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const atual = await this.produtoRepository.buscarPorId(Number(entrada.id));
    if (!atual) {
      throw new ProdutoNaoEncontradoError();
    }

    const categoriaId = Number(entrada.categoria_id ?? atual.categoriaId);
    const categoria = await this.categoriaRepository.buscarPorId(categoriaId);
    if (!categoria || !categoria.ativo) {
      throw new CategoriaNaoEncontradaError();
    }

    const atualizado = new Produto({
      id: atual.id,
      nome: entrada.nome ?? atual.nome,
      categoriaId: categoria.id,
      icone: entrada.icone !== undefined ? entrada.icone : atual.icone,
      preco: entrada.preco ?? atual.preco,
      custo: entrada.custo ?? atual.custo,
      ativo: atual.ativo,
      criadoEm: atual.criadoEm,
    });

    if (
      await this.produtoRepository.existeNomeNaCategoria(
        atualizado.categoriaId,
        atualizado.nome,
        atualizado.id,
      )
    ) {
      throw new NomeDuplicadoNaCategoriaError();
    }

    let salvo;
    try {
      salvo = await this.produtoRepository.atualizar(atualizado);
    } catch (erro) {
      if (erro instanceof NomeDuplicadoNaCategoriaError || Number(erro?.errno) === 1062) {
        throw new NomeDuplicadoNaCategoriaError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'atualizar_produto',
        entidade: 'produto',
        entidadeId: salvo.id,
        estadoDepois: { nome: salvo.nome, categoria_id: salvo.categoriaId },
        ip,
      });
    }

    return salvo;
  }
}
