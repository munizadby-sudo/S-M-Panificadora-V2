import { EstoqueDiario, normalizarData } from '../domain/EstoqueDiario.js';
import { ProdutoNaoEncontradoError } from '../../products/domain/erros.js';

export class ObterOuCriarEstoqueDoDia {
  constructor({ estoqueRepository, produtoRepository }) {
    this.estoqueRepository = estoqueRepository;
    this.produtoRepository = produtoRepository;
  }

  async executar({ produtoId, data, conexao } = {}) {
    const id = Number(produtoId);
    const dia = normalizarData(data);
    const produto = await this.produtoRepository.buscarPorId(id);
    if (!produto) {
      throw new ProdutoNaoEncontradoError();
    }

    const existente = await this.estoqueRepository.buscarPorProdutoEData(id, dia, conexao);
    if (existente) {
      return existente;
    }

    const anterior = await this.estoqueRepository.buscarMaisRecenteAnterior(id, dia, conexao);
    const novo = new EstoqueDiario({
      produtoId: id,
      data: dia,
      inicial: anterior ? anterior.disponivel() : 0,
      produzido: 0,
      vendido: 0,
    });

    try {
      return await this.estoqueRepository.salvar(novo, conexao);
    } catch (erro) {
      if (ehDuplicidade(erro)) {
        return this.estoqueRepository.buscarPorProdutoEData(id, dia, conexao);
      }
      throw erro;
    }
  }
}

function ehDuplicidade(erro) {
  return Number(erro?.errno) === 1062 || /Duplicate entry/i.test(String(erro?.message || ''));
}
