import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { ProdutoInativoError } from '../../inventory/domain/erros.js';
import { ProdutoNaoEncontradoError } from '../../products/domain/erros.js';
import { Perda } from '../domain/Perda.js';

export class CreatePerda {
  constructor({ perdaRepository, produtoRepository, debitarEstoque, auditor }) {
    this.perdaRepository = perdaRepository;
    this.produtoRepository = produtoRepository;
    this.debitarEstoque = debitarEstoque;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const produtoId = Number(entrada.produto_id ?? entrada.produtoId);
    const data = normalizarData(entrada.data);
    const quantidade = entrada.quantidade;
    const motivo = entrada.motivo;

    const produto = await this.produtoRepository.buscarPorId(produtoId);
    if (!produto) {
      throw new ProdutoNaoEncontradoError();
    }
    if (!produto.ativo) {
      throw new ProdutoInativoError();
    }

    const salva = await this.perdaRepository.comTransacao(async (conexao) => {
      await this.debitarEstoque.executar(conexao, produtoId, data, quantidade);
      const perda = new Perda({
        produtoId,
        data,
        quantidade,
        motivo,
        produtoCusto: produto.custo,
        usuarioId: executor?.id,
      });
      return this.perdaRepository.salvar(perda, conexao);
    });

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_perda',
        entidade: 'perda',
        entidadeId: salva.id,
        estadoDepois: salva.paraPublico(),
        ip,
      });
    }

    return salva;
  }
}
