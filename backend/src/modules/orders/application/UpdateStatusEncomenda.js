import { EncomendaNaoEncontradaError } from '../domain/erros.js';

export class UpdateStatusEncomenda {
  constructor({ encomendaRepository, auditor }) {
    this.encomendaRepository = encomendaRepository;
    this.auditor = auditor;
  }

  async executar(id, status, executor, ip = null) {
    const existente = await this.encomendaRepository.buscarPorId(Number(id));
    if (!existente || !existente.ativo) {
      throw new EncomendaNaoEncontradaError();
    }

    const statusAnterior = existente.status;
    existente.mudarStatus(status);
    const salva = await this.encomendaRepository.atualizar(existente);

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
