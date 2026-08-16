import { CaixaTurno, dinheiro } from '../domain/CaixaTurno.js';
import { dataHoje, determinarPeriodo } from '../domain/DeterminadorDePeriodo.js';
import { FundoNegativoError, PeriodoJaRegistradoError, TurnoJaAbertoError } from '../domain/erros.js';

export class AbrirCaixa {
  constructor({ caixaTurnoRepository, correcaoPendenteRepository, auditor }) {
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.correcaoPendenteRepository = correcaoPendenteRepository;
    this.auditor = auditor;
  }

  async executar({ fundo_especie, fundo_moedas }, executor, ip = null) {
    const fundoEspecie = dinheiro(fundo_especie);
    const fundoMoedas = dinheiro(fundo_moedas);
    if (fundoEspecie < 0 || fundoMoedas < 0) {
      throw new FundoNegativoError();
    }

    const aberto = await this.caixaTurnoRepository.buscarTurnoAberto();
    if (aberto) {
      throw new TurnoJaAbertoError();
    }

    const data = dataHoje();
    const periodo = determinarPeriodo();
    if (await this.caixaTurnoRepository.existeParaPeriodo(data, periodo)) {
      throw new PeriodoJaRegistradoError();
    }

    const turno = await this.caixaTurnoRepository.salvar(
      new CaixaTurno({
        data,
        periodo,
        status: 'aberto',
        abertoPor: executor.id,
        fundoEspecie,
        fundoMoedas,
      }),
    );

    const correcoesPendentes = this.correcaoPendenteRepository
      ? await this.correcaoPendenteRepository.listarPendentes()
      : [];

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor.id,
        acao: 'abrir_caixa',
        entidade: 'caixa_turno',
        entidadeId: turno.id,
        estadoDepois: { data, periodo, fundo_especie: fundoEspecie, fundo_moedas: fundoMoedas },
        ip,
      });
    }

    return {
      id: turno.id,
      data: turno.data,
      periodo: turno.periodo,
      status: 'aberto',
      correcoes_pendentes: correcoesPendentes,
    };
  }
}
