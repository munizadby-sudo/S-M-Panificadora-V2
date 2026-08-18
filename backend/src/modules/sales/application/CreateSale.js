import { dataHoje } from '../../inventory/domain/EstoqueDiario.js';
import { EstoqueInsuficienteError, ProdutoInativoError } from '../../inventory/domain/erros.js';
import { ProdutoNaoEncontradoError } from '../../products/domain/erros.js';
import { Venda, VendaItem } from '../domain/Venda.js';
import { CaixaFechadoError, CarrinhoVazioError } from '../domain/erros.js';

export class CreateSale {
  constructor({
    vendaRepository,
    sequenciaRepository,
    caixaTurnoRepository,
    produtoRepository,
    debitarEstoque,
    fluxoCaixaRepository,
    auditor,
  }) {
    this.vendaRepository = vendaRepository;
    this.sequenciaRepository = sequenciaRepository;
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.produtoRepository = produtoRepository;
    this.debitarEstoque = debitarEstoque;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const turno = await this.caixaTurnoRepository.buscarTurnoAberto();
    if (!turno) {
      throw new CaixaFechadoError();
    }

    const itensEntrada = entrada?.itens;
    if (!Array.isArray(itensEntrada) || itensEntrada.length === 0) {
      throw new CarrinhoVazioError();
    }

    const dia = dataHoje();
    const formaPagamento = entrada.forma_pagamento ?? entrada.formaPagamento;

    const salva = await this.vendaRepository.comTransacao(async (conexao) => {
      const numero = await this.sequenciaRepository.proximoNumero('venda', conexao);
      const itensMontados = [];

      for (const item of itensEntrada) {
        const produtoId = Number(item.produto_id ?? item.produtoId);
        const produto = await this.produtoRepository.buscarPorId(produtoId);
        if (!produto) {
          throw new ProdutoNaoEncontradoError();
        }
        if (!produto.ativo) {
          throw new ProdutoInativoError();
        }
        itensMontados.push(
          new VendaItem({
            produtoId,
            quantidade: item.quantidade,
            precoUnitario: produto.preco,
          }),
        );
      }

      for (const item of itensMontados) {
        try {
          await this.debitarEstoque.executar(conexao, item.produtoId, dia, item.quantidade);
        } catch (erro) {
          if (erro instanceof EstoqueInsuficienteError) {
            throw new EstoqueInsuficienteError(
              `Estoque insuficiente para produto_id=${item.produtoId}.`,
            );
          }
          throw erro;
        }
      }

      const venda = new Venda({
        numero,
        turnoId: turno.id,
        usuarioId: executor?.id,
        formaPagamento,
        itens: itensMontados,
      });

      const persistida = await this.vendaRepository.salvar(venda, conexao);

      await this.fluxoCaixaRepository.registrar(
        {
          usuarioId: executor?.id,
          turnoId: turno.id,
          tipo: 'entrada',
          descricao: `Venda #${numero}`,
          categoria: 'vendas',
          forma: persistida.formaPagamento,
          valor: persistida.total,
          data: dia,
          geradoAuto: true,
          vendaId: persistida.id,
        },
        conexao,
      );

      return persistida;
    });

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_venda',
        entidade: 'venda',
        entidadeId: salva.id,
        estadoDepois: salva.paraPublico(),
        ip,
      });
    }

    return salva;
  }
}
