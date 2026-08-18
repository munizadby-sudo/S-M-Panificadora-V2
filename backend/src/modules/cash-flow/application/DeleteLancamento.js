import {
  ExclusaoDeLancamentoAutomaticoNaoPermitidaError,
  LancamentoNaoEncontradoError,
  MotivoExclusaoObrigatorioError,
} from '../domain/erros.js';

export class DeleteLancamento {
  constructor({ lancamentoRepository, auditor }) {
    this.lancamentoRepository = lancamentoRepository;
    this.auditor = auditor;
  }

  async executar({ id, motivo }, executor, ip = null) {
    const lancamentoId = Number(id);
    const lancamento = await this.lancamentoRepository.buscarPorId(lancamentoId);
    if (!lancamento || !lancamento.ativo) {
      throw new LancamentoNaoEncontradoError();
    }

    if (lancamento.geradoAuto && executor?.role !== 'admin') {
      throw new ExclusaoDeLancamentoAutomaticoNaoPermitidaError();
    }

    const motivoNormalizado = String(motivo ?? '').trim();
    if (!motivoNormalizado) {
      throw new MotivoExclusaoObrigatorioError();
    }

    lancamento.marcarExcluido({
      excluidoPor: executor?.id,
      motivoExclusao: motivoNormalizado,
    });
    await this.lancamentoRepository.marcarExcluido(lancamento);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'excluir_lancamento_fluxo',
        entidade: 'fluxo_caixa',
        entidadeId: lancamento.id,
        estadoAntes: { ativo: 1, gerado_auto: lancamento.geradoAuto ? 1 : 0 },
        estadoDepois: {
          ativo: 0,
          motivo_exclusao: motivoNormalizado,
        },
        ip,
      });
    }

    return lancamento;
  }
}
