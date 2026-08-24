import { classificarCurvaABC } from '../domain/classificarCurvaABC.js';
import { agregarItensPorProduto } from './agregarItensPorProduto.js';
import { validarPeriodo } from './validarPeriodo.js';

export class CurvaABCProdutos {
  constructor({ vendaRepository }) {
    this.vendaRepository = vendaRepository;
  }

  async executar({ data_inicio, data_fim } = {}) {
    const { dataInicio, dataFim } = validarPeriodo({ data_inicio, data_fim });
    const itens = await this.vendaRepository.listarItensConfirmadosNoPeriodo(dataInicio, dataFim);
    const agregados = agregarItensPorProduto(itens).map((item) => ({
      produto: item.produto,
      quantidade: item.quantidade,
      receita: item.receita,
    }));

    const porReceita = classificarCurvaABC(agregados);
    const porQuantidade = [...agregados]
      .sort(
        (a, b) =>
          Number(b.quantidade) - Number(a.quantidade) ||
          a.produto.localeCompare(b.produto, 'pt-BR'),
      )
      .map(({ produto, quantidade, receita }) => ({ produto, quantidade, receita }));

    return {
      por_receita: porReceita,
      por_quantidade: porQuantidade,
    };
  }
}
