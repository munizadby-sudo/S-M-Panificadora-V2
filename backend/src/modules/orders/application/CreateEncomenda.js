import { ClienteNaoEncontradoError } from '../../customers/domain/erros.js';
import { Encomenda } from '../domain/Encomenda.js';
import { resolverItens } from './resolverItens.js';

export class CreateEncomenda {
  constructor({ encomendaRepository, produtoRepository, clienteRepository, sequenciaRepository, auditor }) {
    this.encomendaRepository = encomendaRepository;
    this.produtoRepository = produtoRepository;
    this.clienteRepository = clienteRepository;
    this.sequenciaRepository = sequenciaRepository;
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
      return this.encomendaRepository.salvar(encomenda, conexao);
    });

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_encomenda',
        entidade: 'encomenda',
        entidadeId: salva.id,
        estadoDepois: salva.paraPublico(),
        ip,
      });
    }

    return salva;
  }
}
