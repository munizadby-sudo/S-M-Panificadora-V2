import { dataHoje, normalizarData } from '../domain/EstoqueDiario.js';
import { ProdutoInativoError } from '../domain/erros.js';
import { ProdutoNaoEncontradoError } from '../../products/domain/erros.js';

export class UpsertEstoque {
  constructor({ estoqueRepository, produtoRepository, obterOuCriarEstoqueDoDia, auditor }) {
    this.estoqueRepository = estoqueRepository;
    this.produtoRepository = produtoRepository;
    this.obterOuCriarEstoqueDoDia = obterOuCriarEstoqueDoDia;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null, conexao) {
    const produtoId = Number(entrada.produtoId ?? entrada.produto_id);
    const dia =
      entrada.data === undefined || entrada.data === null || entrada.data === ''
        ? dataHoje()
        : normalizarData(entrada.data);

    const produto = await this.produtoRepository.buscarPorId(produtoId);
    if (!produto) {
      throw new ProdutoNaoEncontradoError();
    }
    if (!produto.ativo) {
      throw new ProdutoInativoError();
    }

    const estoque = await this.obterOuCriarEstoqueDoDia.executar({
      produtoId,
      data: dia,
      conexao,
    });
    estoque.ajustar({
      inicial: entrada.inicial,
      produzido: entrada.produzido,
      minimo: entrada.minimo,
    });
    const salvo = await this.estoqueRepository.atualizar(estoque, conexao);

    if (this.auditor && conexao === undefined) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'upsert_estoque',
        entidade: 'estoque_diario',
        entidadeId: salvo.id,
        estadoDepois: {
          produto_id: salvo.produtoId,
          data: salvo.data,
          inicial: salvo.inicial,
          produzido: salvo.produzido,
          minimo: salvo.minimo,
        },
        ip,
      });
    }

    return salvo;
  }
}
