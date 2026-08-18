import { ProdutoNaoEncontradoError } from '../domain/erros.js';

export class DeactivateProduto {
  constructor({ produtoRepository, auditor }) {
    this.produtoRepository = produtoRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const produto = await this.produtoRepository.buscarPorId(Number(id));
    if (!produto) {
      throw new ProdutoNaoEncontradoError();
    }
    if (!produto.ativo) {
      return produto;
    }

    produto.desativar();
    const salvo = await this.produtoRepository.atualizar(produto);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'desativar_produto',
        entidade: 'produto',
        entidadeId: salvo.id,
        estadoDepois: { ativo: 0 },
        ip,
      });
    }

    return salvo;
  }
}
