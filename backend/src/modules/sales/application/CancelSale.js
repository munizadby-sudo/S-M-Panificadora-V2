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
    if (!venda) {
      throw new VendaNaoEncontradaError();
    }
    if (venda.status === 'cancelada') {
      return { status: 'cancelada', tipo: 'cancelamento_direto', idempotente: true };
    }

    const turno = await this.caixaTurnoRepository.buscarPorId(venda.turnoId);
    if (!turno) {
      throw new VendaNaoEncontradaError();
    }

    if (turno.status === 'aberto') {
      let pulouPorJaCancelada = false;
      await this.vendaRepository.comTransacao(async (conexao) => {
        const atual = await this.vendaRepository.buscarPorId(venda.id, conexao);
        if (!atual || atual.status === 'cancelada') {
          pulouPorJaCancelada = true;
          return;
        }

        const itens = await this.vendaRepository.buscarItensPorVendaId(atual.id, conexao);
        const dataOriginal = atual.dataOperacao();

        for (const item of itens) {
          await this.reverterDebito.executar(
            conexao,
            item.produtoId,
            dataOriginal,
            item.quantidade,
          );
        }

        for (const pagamento of atual.pagamentos) {
          await this.fluxoCaixaRepository.registrar(
            {
              usuarioId: executor?.id,
              turnoId: atual.turnoId,
              tipo: 'saida',
              descricao: `Estorno venda #${atual.numero}`,
              categoria: 'estorno',
              forma: pagamento.formaPagamento,
              valor: pagamento.valor,
              data: dataOriginal,
              geradoAuto: true,
              vendaId: atual.id,
            },
            conexao,
          );
        }

        atual.cancelar(motivoNormalizado, executor?.id);
        await this.vendaRepository.atualizar(atual, conexao);
      });

      if (pulouPorJaCancelada) {
        return { status: 'cancelada', tipo: 'cancelamento_direto', idempotente: true };
      }

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
