import { ClienteNaoEncontradoError } from '../domain/erros.js';

export class DeactivateCliente {
  constructor({ clienteRepository, auditor }) {
    this.clienteRepository = clienteRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const cliente = await this.clienteRepository.buscarPorId(Number(id));
    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }
    if (!cliente.ativo) {
      return cliente;
    }

    cliente.desativar();
    const salvo = await this.clienteRepository.atualizar(cliente);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'desativar_cliente',
        entidade: 'cliente',
        entidadeId: salvo.id,
        estadoDepois: { ativo: 0 },
        ip,
      });
    }

    return salvo;
  }
}
