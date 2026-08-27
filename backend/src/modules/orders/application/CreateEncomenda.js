import { ClienteNaoEncontradoError } from '../../customers/domain/erros.js';
import { dataHoje } from '../../inventory/domain/EstoqueDiario.js';
import { dinheiro } from '../../products/domain/Produto.js';
import { CaixaFechadoError, FormaPagamentoInvalidaError } from '../../sales/domain/erros.js';
import { FORMAS_PAGAMENTO } from '../../sales/domain/Venda.js';
import { Encomenda } from '../domain/Encomenda.js';
import { resolverItens } from './resolverItens.js';

export class CreateEncomenda {
  constructor({
    encomendaRepository,
    produtoRepository,
    clienteRepository,
    sequenciaRepository,
    caixaTurnoRepository,
    fluxoCaixaRepository,
    auditor,
  }) {
    this.encomendaRepository = encomendaRepository;
    this.produtoRepository = produtoRepository;
    this.clienteRepository = clienteRepository;
    this.sequenciaRepository = sequenciaRepository;
    this.caixaTurnoRepository = caixaTurnoRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const clienteId = entrada.cliente_id ?? entrada.clienteId ?? null;
    if (clienteId != null && clienteId !== '') {
      const cliente = await this.clienteRepository.buscarPorId(Number(clienteId));
      if (!cliente) {
        throw new ClienteNaoEncontradoError();
      }
    }

    const itens = await resolverItens(this.produtoRepository, entrada.itens);
    const sinal = dinheiro(entrada.sinal ?? 0);
    const { turno, formaPagamento } = await exigirCaixaEFormaDoSinal({
      sinal,
      forma: entrada.forma,
      caixaTurnoRepository: this.caixaTurnoRepository,
    });

    const salva = await this.encomendaRepository.comTransacao(async (conexao) => {
      const numero = await this.sequenciaRepository.proximoNumero('encomenda', conexao);
      const encomenda = new Encomenda({
        numero,
        clienteId: clienteId || null,
        clienteNome: entrada.cliente_nome ?? entrada.clienteNome,
        clienteTelefone: entrada.cliente_telefone ?? entrada.clienteTelefone,
        dataEntrega: entrada.data_entrega ?? entrada.dataEntrega,
        sinal: entrada.sinal ?? 0,
        observacoes: entrada.observacoes,
        itens,
        usuarioId: executor?.id,
      });
      const persistida = await this.encomendaRepository.salvar(encomenda, conexao);

      if (sinal > 0) {
        await this.fluxoCaixaRepository.registrar(
          {
            usuarioId: executor?.id,
            turnoId: turno.id,
            tipo: 'entrada',
            descricao: `Sinal encomenda Nº ${persistida.numero} — ${persistida.clienteNome}`,
            categoria: 'encomenda',
            forma: formaPagamento,
            valor: persistida.sinal,
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
        acao: 'criar_encomenda',
        entidade: 'encomenda',
        entidadeId: salva.id,
        estadoDepois: {
          ...salva.paraPublico(),
          sinal_lancado: sinal > 0,
          forma: sinal > 0 ? formaPagamento : null,
        },
        ip,
      });
    }

    return salva;
  }
}

export async function exigirCaixaEFormaDoSinal({ sinal, forma, caixaTurnoRepository }) {
  if (!(Number(sinal) > 0)) {
    return { turno: null, formaPagamento: '' };
  }
  const turno = await caixaTurnoRepository.buscarTurnoAberto();
  if (!turno) {
    throw new CaixaFechadoError('Abra o caixa para receber o sinal.');
  }
  const formaPagamento = String(forma ?? '').trim().toLowerCase();
  if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
    throw new FormaPagamentoInvalidaError();
  }
  return { turno, formaPagamento };
}
