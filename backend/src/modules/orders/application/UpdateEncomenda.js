import { ClienteNaoEncontradoError } from '../../customers/domain/erros.js';
import { Encomenda } from '../domain/Encomenda.js';
import { EncomendaNaoEncontradaError } from '../domain/erros.js';
import { resolverItens } from './resolverItens.js';

export class UpdateEncomenda {
  constructor({ encomendaRepository, produtoRepository, clienteRepository, auditor }) {
    this.encomendaRepository = encomendaRepository;
    this.produtoRepository = produtoRepository;
    this.clienteRepository = clienteRepository;
    this.auditor = auditor;
  }

  async executar(id, entrada, executor, ip = null) {
    const clienteId = entrada.cliente_id ?? entrada.clienteId ?? null;
    if (clienteId != null && clienteId !== '') {
      const cliente = await this.clienteRepository.buscarPorId(Number(clienteId));
      if (!cliente) {
        throw new ClienteNaoEncontradoError();
      }
    }

    const itens = await resolverItens(this.produtoRepository, entrada.itens);

    const atualizada = await this.encomendaRepository.comTransacao(async (conexao) => {
      const existente = await this.encomendaRepository.buscarPorId(Number(id), conexao);
      if (!existente || !existente.ativo) {
        throw new EncomendaNaoEncontradaError();
      }
      existente.garantirEditavel();

      const estadoAntes = existente.paraPublico();

      const revisada = new Encomenda({
        id: existente.id,
        numero: existente.numero,
        clienteId: clienteId || null,
        clienteNome: entrada.cliente_nome ?? entrada.clienteNome,
        clienteTelefone: entrada.cliente_telefone ?? entrada.clienteTelefone,
        dataEntrega: entrada.data_entrega ?? entrada.dataEntrega,
        sinal: entrada.sinal ?? 0,
        observacoes: entrada.observacoes,
        itens,
        status: existente.status,
        usuarioId: existente.usuarioId,
        criadoEm: existente.criadoEm,
      });

      // substitui todos os itens — nunca faz merge incremental (PRD, SPEC-BE-011 Seção 4.2)
      await this.encomendaRepository.substituirItens(existente.id, revisada.itens, conexao);
      const salva = await this.encomendaRepository.atualizar(revisada, conexao);

      if (this.auditor) {
        await this.auditor.registrar({
          usuarioId: executor?.id,
          acao: 'atualizar_encomenda',
          entidade: 'encomenda',
          entidadeId: salva.id,
          estadoAntes,
          estadoDepois: salva.paraPublico(),
          ip,
        });
      }

      return salva;
    });

    return atualizada;
  }
}
