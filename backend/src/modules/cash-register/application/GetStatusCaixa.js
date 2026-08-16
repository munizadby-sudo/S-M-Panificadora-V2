import { calcularFechamento } from '../domain/FechamentoCaixa.js';

export class GetStatusCaixa {
  constructor({ caixaTurnoRepository, fluxoCaixaRepository }) {
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
  }

  async executar() {
    const turno = await this.caixaTurnoRepository.buscarTurnoAberto();
    if (!turno) {
      return { aberto: false, turno: null };
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
      aberto: true,
      turno: {
        id: turno.id,
        data: turno.data,
        periodo: turno.periodo,
        status: turno.status,
        fundo_especie: turno.fundoEspecie,
        fundo_moedas: turno.fundoMoedas,
        esperado,
      },
    };
  }
}
