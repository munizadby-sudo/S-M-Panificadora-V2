import { dataHoje } from '../../inventory/domain/EstoqueDiario.js';
import { CaixaFechadoError } from '../../sales/domain/erros.js';
import { LancamentoFluxoCaixa } from '../domain/LancamentoFluxoCaixa.js';

export class CreateLancamentoManual {
  constructor({ caixaTurnoRepository, lancamentoRepository, auditor }) {
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.lancamentoRepository = lancamentoRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const turno = await this.caixaTurnoRepository.buscarTurnoAberto();
    if (!turno) {
      throw new CaixaFechadoError('Caixa fechado. Abra um turno antes de registrar lançamentos.');
    }

    const lancamento = new LancamentoFluxoCaixa({
      usuarioId: executor?.id,
      turnoId: turno.id,
      tipo: entrada?.tipo,
      descricao: entrada?.descricao,
      categoria: entrada?.categoria,
      forma: entrada?.forma,
      valor: entrada?.valor,
      data: dataHoje(),
      geradoAuto: false,
    });

    const salvo = await this.lancamentoRepository.salvar(lancamento);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_lancamento_manual',
        entidade: 'fluxo_caixa',
        entidadeId: salvo.id,
        estadoDepois: salvo.paraCriacao(),
        ip,
      });
    }

    return salvo;
  }
}
