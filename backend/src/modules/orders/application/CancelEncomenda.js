import { EncomendaNaoEncontradaError } from '../domain/erros.js';
import { estornarLancamentosDaEncomenda } from './estornarLancamentosDaEncomenda.js';

export class CancelEncomenda {
  constructor({ encomendaRepository, fluxoCaixaRepository, auditor }) {
    this.encomendaRepository = encomendaRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
    this.auditor = auditor;
  }

  async executar(id, executor, ip = null) {
    const existente = await this.encomendaRepository.buscarPorId(Number(id));
    if (!existente || !existente.ativo) {
      throw new EncomendaNaoEncontradaError();
    }

    existente.cancelar();
    const cancelada = await this.encomendaRepository.atualizar(existente);

    await estornarLancamentosDaEncomenda(
      this.fluxoCaixaRepository,
      cancelada.id,
      executor,
      'Cancelamento de encomenda',
    );

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'cancelar_encomenda',
        entidade: 'encomenda',
        entidadeId: cancelada.id,
        estadoDepois: { ativo: 0 },
        ip,
      });
    }

    return cancelada;
  }
}
