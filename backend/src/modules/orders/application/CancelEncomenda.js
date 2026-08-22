import { EncomendaNaoEncontradaError } from '../domain/erros.js';

export class CancelEncomenda {
  constructor({ encomendaRepository, auditor }) {
    this.encomendaRepository = encomendaRepository;
    this.auditor = auditor;
  }

  async executar(id, executor, ip = null) {
    const existente = await this.encomendaRepository.buscarPorId(Number(id));
    if (!existente || !existente.ativo) {
      throw new EncomendaNaoEncontradaError();
    }

    existente.cancelar();
    const cancelada = await this.encomendaRepository.atualizar(existente);

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
