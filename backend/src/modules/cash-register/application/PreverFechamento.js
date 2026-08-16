import { calcularFechamento } from '../domain/FechamentoCaixa.js';
import { NenhumTurnoAbertoError } from '../domain/erros.js';

export class PreverFechamento {
  constructor({ caixaTurnoRepository, fluxoCaixaRepository }) {
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
  }

  async executar() {
    const turno = await this.caixaTurnoRepository.buscarTurnoAberto();
    if (!turno) {
      throw new NenhumTurnoAbertoError();
    }

    const totais = this.fluxoCaixaRepository
      ? await this.fluxoCaixaRepository.somarPorFormaETurno(turno.id, ['vendas', 'estorno'])
      : [];
    const { esperado } = calcularFechamento({
      fundoEspecie: turno.fundoEspecie,
      fundoMoedas: turno.fundoMoedas,
      totaisPorForma: totais,
    });

    return {
      turno_id: turno.id,
      periodo: turno.periodo,
      esperado,
    };
  }
}
