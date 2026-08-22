import { EncomendaNaoEncontradaError } from '../domain/erros.js';

export class GetEncomenda {
  constructor({ encomendaRepository }) {
    this.encomendaRepository = encomendaRepository;
  }

  async executar(id) {
    const encomenda = await this.encomendaRepository.buscarPorId(Number(id));
    if (!encomenda || !encomenda.ativo) {
      throw new EncomendaNaoEncontradaError();
    }
    return encomenda;
  }
}
