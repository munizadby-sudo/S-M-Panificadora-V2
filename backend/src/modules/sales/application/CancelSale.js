import { MotivoCancelamentoObrigatorioError, VendaNaoEncontradaError } from '../domain/erros.js';

export class CancelSale {
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

  async executar({ id, motivo }, executor, ip = null) {
    const motivoNormalizado = String(motivo ?? '').trim();
    if (!motivoNormalizado) {
      throw new MotivoCancelamentoObrigatorioError();
    }

    const venda = await this.vendaRepository.buscarPorId(Number(id));
    if (!venda || venda.status === 'cancelada') {
      throw new VendaNaoEncontradaError();
    }

    const turno = await this.caixaTurnoRepository.buscarPorId(venda.turnoId);
    if (!turno) {
      throw new VendaNaoEncontradaError();
    }

    if (turno.status === 'aberto') {
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
            turnoId: venda.turnoId,
            tipo: 'saida',
            descricao: `Estorno venda #${venda.numero}`,
            categoria: 'estorno',
            forma: venda.formaPagamento,
            valor: venda.total,
            data: dataOriginal,
            geradoAuto: true,
            vendaId: venda.id,
          },
          conexao,
        );

        venda.cancelar(motivoNormalizado, executor?.id);
        await this.vendaRepository.atualizar(venda, conexao);
      });

      if (this.auditor) {
        await this.auditor.registrar({
          usuarioId: executor?.id,
          acao: 'cancelar_venda',
          entidade: 'venda',
          entidadeId: venda.id,
          estadoDepois: { status: 'cancelada', motivo: motivoNormalizado },
          ip,
        });
      }

      return { status: 'cancelada', tipo: 'cancelamento_direto' };
    }

    const correcao = await this.correcaoPendenteRepository.criar(
      {
        vendaId: venda.id,
        motivo: motivoNormalizado,
        solicitadoPor: executor?.id,
      },
      null,
    );

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'solicitar_correcao_venda',
        entidade: 'correcao_pendente',
        entidadeId: correcao.id,
        estadoDepois: { venda_id: venda.id, status: 'pendente' },
        ip,
      });
    }

    return {
      status: 'correcao_pendente',
      tipo: 'correcao_pendente',
      correcao_id: correcao.id,
    };
  }
}
