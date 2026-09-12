import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';
import { agregarItensPorProduto } from './agregarItensPorProduto.js';
import { validarPeriodo } from './validarPeriodo.js';

export class RelatorioVendas {
  constructor({ vendaRepository }) {
    this.vendaRepository = vendaRepository;
  }

  async executar({ data_inicio, data_fim } = {}) {
    const { dataInicio, dataFim } = validarPeriodo({ data_inicio, data_fim });
    const itens = await this.vendaRepository.listarItensConfirmadosNoPeriodo(dataInicio, dataFim);
    const pagamentos = await this.vendaRepository.listarPagamentosConfirmadosNoPeriodo(
      dataInicio,
      dataFim,
    );

    let totalGeral = 0;
    let quantidadeItens = 0;
    const vendasDistintas = new Set();
    const porForma = new Map();

    for (const item of itens) {
      const subtotal = dinheiro(item.subtotal);
      totalGeral = dinheiro(totalGeral + subtotal);
      quantidadeItens += Number(item.quantidade) || 0;
      if (item.vendaId != null) {
        vendasDistintas.add(item.vendaId);
      }
    }

    for (const pagamento of pagamentos) {
      const valor = dinheiro(pagamento.valor);
      const forma = String(pagamento.formaPagamento || pagamento.forma_pagamento || '').trim() || 'desconhecida';
      porForma.set(forma, dinheiro((porForma.get(forma) || 0) + valor));
    }

    const numeroVendas = vendasDistintas.size;
    const ticketMedio = numeroVendas === 0 ? 0 : dinheiro(totalGeral / numeroVendas);

    const porProduto = agregarItensPorProduto(itens)
      .map((item) => ({
        produto: item.produto,
        quantidade: item.quantidade,
        receita: item.receita,
      }))
      .sort((a, b) => b.receita - a.receita || a.produto.localeCompare(b.produto, 'pt-BR'));

    return {
      total_geral: dinheiro(totalGeral),
      quantidade_itens: quantidadeItens,
      numero_vendas: numeroVendas,
      ticket_medio: ticketMedio,
      por_forma_pagamento: [...porForma.entries()]
        .map(([forma_pagamento, total]) => ({ forma_pagamento, total }))
        .sort((a, b) => b.total - a.total || a.forma_pagamento.localeCompare(b.forma_pagamento)),
      por_produto: porProduto,
    };
  }
}
