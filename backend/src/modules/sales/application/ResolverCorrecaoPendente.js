import {
  CorrecaoPendenteNaoEncontradaError,
  SemTurnoAbertoParaCorrecaoError,
  VendaNaoEncontradaError,
} from '../domain/erros.js';

export class ResolverCorrecaoPendente {
  constructor({
    vendaRepository,
    caixaTurnoRepository,
    reverterDebito,
    fluxoCaixaRepository,
    correcaoPendenteRepository,
    auditor,
  }) {
    this.vendaRepository = vendaRepository;
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.reverterDebito = reverterDebito;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
    this.correcaoPendenteRepository = correcaoPendenteRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const correcao = await this.correcaoPendenteRepository.buscarPorId(Number(id));
    if (!correcao || correcao.status !== 'pendente') {
      throw new CorrecaoPendenteNaoEncontradaError();
    }

    const turnoAtual = await this.caixaTurnoRepository.buscarTurnoAberto();
    if (!turnoAtual) {
      throw new SemTurnoAbertoParaCorrecaoError();
    }

    const venda = await this.vendaRepository.buscarPorId(correcao.vendaId);
    if (!venda || venda.status === 'cancelada') {
      throw new VendaNaoEncontradaError();
    }

    await this.vendaRepository.comTransacao(async (conexao) => {
      const itens = await this.vendaRepository.buscarItensPorVendaId(venda.id, conexao);
      const dataOriginal = venda.dataOperacao();

      for (const item of itens) {
        await this.reverterDebito.executar(
          conexao,
          item.produtoId,
          dataOriginal,
          item.quantidade,
        );
      }

      await this.fluxoCaixaRepository.registrar(
        {
          usuarioId: executor?.id,
          turnoId: turnoAtual.id,
          tipo: 'saida',
          descricao: `Correção venda #${venda.numero}`,
          categoria: 'correcao_venda_anterior',
          forma: venda.formaPagamento,
          valor: venda.total,
          data: turnoAtual.data,
          geradoAuto: true,
          vendaId: venda.id,
        },
        conexao,
      );

      venda.cancelar(correcao.motivo, executor?.id);
      await this.vendaRepository.atualizar(venda, conexao);
      await this.correcaoPendenteRepository.marcarResolvida(correcao.id, executor?.id, conexao);
    });

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'resolver_correcao_venda',
        entidade: 'correcao_pendente',
        entidadeId: correcao.id,
        estadoDepois: { status: 'resolvida', venda_id: venda.id, turno_id: turnoAtual.id },
        ip,
      });
    }

    return { status: 'resolvida', venda_id: venda.id, turno_id: turnoAtual.id };
  }
}
