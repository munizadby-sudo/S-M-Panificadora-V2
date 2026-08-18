import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';
import { TurnoNaoEncontradoError } from '../../cash-register/domain/erros.js';

const FORMAS = ['dinheiro', 'pix', 'cartao'];

export class GetResumoPorTurno {
  constructor({ caixaTurnoRepository, fluxoCaixaRepository }) {
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
  }

  async executar({ turno_id } = {}) {
    const turnoId = Number(turno_id);
    if (!Number.isInteger(turnoId) || turnoId <= 0) {
      throw new TurnoNaoEncontradoError();
    }

    const turno = await this.caixaTurnoRepository.buscarPorId(turnoId);
    if (!turno) {
      throw new TurnoNaoEncontradoError();
    }

    const linhas = this.fluxoCaixaRepository
      ? await this.fluxoCaixaRepository.agregarEntradasSaidasPorTurno(turnoId, null)
      : [];

    return montarResumo(linhas);
  }
}

export function montarResumo(linhas) {
  const entradas = formaZerada();
  const saidas = formaZerada();

  for (const linha of linhas) {
    if (FORMAS.includes(linha.forma)) {
      entradas[linha.forma] = dinheiro(linha.entradas);
      saidas[linha.forma] = dinheiro(linha.saidas);
    }
  }

  return { entradas, saidas };
}

function formaZerada() {
  return {
    dinheiro: 0,
    pix: 0,
    cartao: 0,
  };
}
