import { ClienteNaoEncontradoError, TelefoneJaCadastradoError } from '../domain/erros.js';
import { ehDuplicidade } from './CreateCliente.js';

export class ReactivateCliente {
  constructor({ clienteRepository, auditor }) {
    this.clienteRepository = clienteRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const cliente = await this.clienteRepository.buscarPorId(Number(id));
    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }
    if (cliente.ativo) {
      return cliente;
    }

    if (await this.clienteRepository.existeTelefoneAtivo(cliente.telefone, cliente.id)) {
      throw new TelefoneJaCadastradoError();
    }

    cliente.reativar();
    let salvo;
    try {
      salvo = await this.clienteRepository.atualizar(cliente);
    } catch (erro) {
      if (erro instanceof TelefoneJaCadastradoError || ehDuplicidade(erro)) {
        throw new TelefoneJaCadastradoError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'reativar_cliente',
        entidade: 'cliente',
        entidadeId: salvo.id,
        estadoDepois: { ativo: 1 },
        ip,
      });
    }

    return salvo;
  }
}
