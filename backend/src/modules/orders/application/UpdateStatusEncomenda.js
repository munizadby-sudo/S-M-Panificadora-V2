import { EncomendaNaoEncontradaError } from '../domain/erros.js';
import { estornarLancamentosDaEncomenda } from './estornarLancamentosDaEncomenda.js';

export class UpdateStatusEncomenda {
  constructor({ encomendaRepository, fluxoCaixaRepository, auditor }) {
    this.encomendaRepository = encomendaRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
    this.auditor = auditor;
  }

  async executar(id, status, executor, ip = null) {
    const existente = await this.encomendaRepository.buscarPorId(Number(id));
    if (!existente || !existente.ativo) {
      throw new EncomendaNaoEncontradaError();
    }

    const statusAnterior = existente.status;
    existente.mudarStatus(status, { role: executor?.role });
    const salva = await this.encomendaRepository.atualizar(existente);

    if (statusAnterior === 'entregue' && salva.status === 'pronto') {
      await estornarLancamentosDaEncomenda(
        this.fluxoCaixaRepository,
        salva.id,
        executor,
        'Reabertura de encomenda entregue',
      );
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'mudar_status_encomenda',
        entidade: 'encomenda',
        entidadeId: salva.id,
        estadoAntes: { status: statusAnterior },
        estadoDepois: { status: salva.status },
        ip,
      });
    }

    return salva;
  }
}
