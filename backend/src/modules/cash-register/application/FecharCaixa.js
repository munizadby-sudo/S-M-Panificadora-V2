import { dinheiro } from '../domain/CaixaTurno.js';
import { calcularFechamento, classificarStatusResumo } from '../domain/FechamentoCaixa.js';
import { TurnoNaoEncontradoError } from '../domain/erros.js';

export class FecharCaixa {
  constructor({ caixaTurnoRepository, fluxoCaixaRepository, auditor }) {
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const turnoId = Number(entrada?.turno_id);
    if (!Number.isInteger(turnoId) || turnoId <= 0) {
      throw new TurnoNaoEncontradoError();
    }

    const turno = await this.caixaTurnoRepository.buscarPorId(turnoId);
    if (!turno) {
      throw new TurnoNaoEncontradoError();
    }

    if (turno.status === 'fechado') {
      return resumoPersistido(turno, true);
    }

    const totais = this.fluxoCaixaRepository
      ? await this.fluxoCaixaRepository.somarPorFormaETurno(turno.id, ['vendas', 'estorno'])
      : [];
    const apuracao = calcularFechamento({
      fundoEspecie: turno.fundoEspecie,
      fundoMoedas: turno.fundoMoedas,
      totaisPorForma: totais,
      contado: {
        dinheiro: entrada.contado_dinheiro,
        moedas: entrada.contado_moedas,
        pix: entrada.contado_pix,
        cartao: entrada.contado_cartao,
      },
    });

    const resultado = await this.caixaTurnoRepository.fecharAtomico(turno.id, {
      fechadoPor: executor.id,
      observacao: entrada.observacao || null,
      esperado: apuracao.esperado,
      contado: {
        dinheiro: Number(entrada.contado_dinheiro) || 0,
        moedas: Number(entrada.contado_moedas) || 0,
        pix: apuracao.contado.pix,
        cartao: apuracao.contado.cartao,
      },
      diferenca: apuracao.diferenca,
    });

    if (!resultado.afetado) {
      const jaFechado = await this.caixaTurnoRepository.buscarPorId(turno.id);
      return resumoPersistido(jaFechado, true);
    }

    const semImpressao = Boolean(entrada.sem_impressao);
    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor.id,
        acao: semImpressao ? 'fechar_caixa_sem_impressao' : 'fechar_caixa',
        entidade: 'caixa_turno',
        entidadeId: turno.id,
        estadoDepois: { status_resumo: apuracao.statusResumo, sem_impressao: semImpressao },
        ip,
      });
    }

    return {
      id: turno.id,
      periodo: turno.periodo,
      esperado: apuracao.esperado,
      contado: apuracao.contado,
      diferenca: apuracao.diferenca,
      status_resumo: apuracao.statusResumo,
      idempotente: false,
    };
  }
}

function resumoPersistido(turno, idempotente) {
  const esperado = turno?.esperado || {};
  const contado = turno?.contado || {};
  const diferenca = turno?.diferenca || {};
  const diferencaTotal = dinheiro(diferenca.total);

  return {
    id: turno.id,
    periodo: turno.periodo,
    esperado: {
      dinheiro: dinheiro(esperado.dinheiro),
      pix: dinheiro(esperado.pix),
      cartao: dinheiro(esperado.cartao),
    },
    contado: {
      dinheiro: dinheiro(Number(contado.dinheiro || 0) + Number(contado.moedas || 0)),
      pix: dinheiro(contado.pix),
      cartao: dinheiro(contado.cartao),
    },
    diferenca: {
      dinheiro: dinheiro(diferenca.dinheiro),
      pix: dinheiro(diferenca.pix),
      cartao: dinheiro(diferenca.cartao),
      total: diferencaTotal,
    },
    status_resumo: classificarStatusResumo(diferencaTotal),
    idempotente,
  };
}
