import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { ProdutoInativoError } from '../../inventory/domain/erros.js';
import { ProdutoNaoEncontradoError } from '../../products/domain/erros.js';
import { Producao } from '../domain/Producao.js';

export class CreateProducao {
  constructor({ producaoRepository, produtoRepository, incrementarProduzido, auditor }) {
    this.producaoRepository = producaoRepository;
    this.produtoRepository = produtoRepository;
    this.incrementarProduzido = incrementarProduzido;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const produtoId = Number(entrada.produto_id ?? entrada.produtoId);
    const data = normalizarData(entrada.data);
    const quantidade = entrada.quantidade;

    const produto = await this.produtoRepository.buscarPorId(produtoId);
    if (!produto) {
      throw new ProdutoNaoEncontradoError();
    }
    if (!produto.ativo) {
      throw new ProdutoInativoError();
    }

    const salva = await this.producaoRepository.comTransacao(async (conexao) => {
      await this.incrementarProduzido.executar(conexao, produtoId, data, quantidade);
      const producao = new Producao({
        produtoId,
        data,
        quantidade,
        usuarioId: executor?.id,
      });
      return this.producaoRepository.salvar(producao, conexao);
    });

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_producao',
        entidade: 'producao',
        entidadeId: salva.id,
        estadoDepois: salva.paraPublico(),
        ip,
      });
    }

    return salva;
  }
}
