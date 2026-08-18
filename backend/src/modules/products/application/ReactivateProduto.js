import { NomeDuplicadoNaCategoriaError, ProdutoNaoEncontradoError } from '../domain/erros.js';

export class ReactivateProduto {
  constructor({ produtoRepository, auditor }) {
    this.produtoRepository = produtoRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const produto = await this.produtoRepository.buscarPorId(Number(id));
    if (!produto) {
      throw new ProdutoNaoEncontradoError();
    }
    if (produto.ativo) {
      return produto;
    }

    if (await this.produtoRepository.existeNomeNaCategoria(produto.categoriaId, produto.nome, produto.id)) {
      throw new NomeDuplicadoNaCategoriaError();
    }

    produto.reativar();
    let salvo;
    try {
      salvo = await this.produtoRepository.atualizar(produto);
    } catch (erro) {
      if (erro instanceof NomeDuplicadoNaCategoriaError || Number(erro?.errno) === 1062) {
        throw new NomeDuplicadoNaCategoriaError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'reativar_produto',
        entidade: 'produto',
        entidadeId: salvo.id,
        estadoDepois: { ativo: 1 },
        ip,
      });
    }

    return salvo;
  }
}
