import { dataHoje } from '../../inventory/domain/EstoqueDiario.js';
import { CaixaFechadoError, FormaPagamentoInvalidaError } from '../../sales/domain/erros.js';
import { FORMAS_PAGAMENTO } from '../../sales/domain/Venda.js';
import { EncomendaNaoEncontradaError } from '../domain/erros.js';

export class FinalizarEncomenda {
  constructor({ encomendaRepository, caixaTurnoRepository, fluxoCaixaRepository, auditor }) {
    this.encomendaRepository = encomendaRepository;
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
    this.auditor = auditor;
  }

  async executar(id, { forma } = {}, executor, ip = null) {
    const existente = await this.encomendaRepository.buscarPorId(Number(id));
    if (!existente || !existente.ativo) {
      throw new EncomendaNaoEncontradaError();
    }

    const turno = await this.caixaTurnoRepository.buscarTurnoAberto();
    if (!turno) {
      throw new CaixaFechadoError('Abra o caixa para receber a encomenda.');
    }

    const saldo = existente.saldoAReceber();
    const formaPagamento = String(forma ?? '').trim().toLowerCase();
    if (saldo > 0 && !FORMAS_PAGAMENTO.includes(formaPagamento)) {
      throw new FormaPagamentoInvalidaError();
    }

    const salva = await this.encomendaRepository.comTransacao(async (conexao) => {
      existente.finalizarEntrega();
      const persistida = await this.encomendaRepository.atualizar(existente, conexao);

      if (saldo > 0) {
        await this.fluxoCaixaRepository.registrar(
          {
            usuarioId: executor?.id,
            turnoId: turno.id,
            tipo: 'entrada',
            descricao: `Encomenda Nº ${persistida.numero} — ${persistida.clienteNome}`,
            categoria: 'encomenda',
            forma: formaPagamento,
            valor: saldo,
            data: dataHoje(),
            geradoAuto: true,
            encomendaId: persistida.id,
          },
          conexao,
        );
      }

      return persistida;
    });

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'finalizar_encomenda',
        entidade: 'encomenda',
        entidadeId: salva.id,
        estadoDepois: {
          status: salva.status,
          saldo_recebido: saldo,
          forma: saldo > 0 ? formaPagamento : null,
          turno_id: turno.id,
        },
        ip,
      });
    }

    return salva;
  }
}
