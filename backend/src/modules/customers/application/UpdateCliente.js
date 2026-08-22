import { Cliente } from '../domain/Cliente.js';
import { ClienteNaoEncontradoError, TelefoneJaCadastradoError } from '../domain/erros.js';
import { ehDuplicidade } from './CreateCliente.js';

export class UpdateCliente {
  constructor({ clienteRepository, auditor }) {
    this.clienteRepository = clienteRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const atual = await this.clienteRepository.buscarPorId(Number(entrada?.id));
    if (!atual) {
      throw new ClienteNaoEncontradoError();
    }

    const atualizado = new Cliente({
      id: atual.id,
      nome: entrada?.nome ?? atual.nome,
      telefone: entrada?.telefone ?? atual.telefone,
      ativo: atual.ativo,
      criadoEm: atual.criadoEm,
    });

    if (await this.clienteRepository.existeTelefoneAtivo(atualizado.telefone, atualizado.id)) {
      throw new TelefoneJaCadastradoError();
    }

    let salvo;
    try {
      salvo = await this.clienteRepository.atualizar(atualizado);
    } catch (erro) {
      if (erro instanceof TelefoneJaCadastradoError || ehDuplicidade(erro)) {
        throw new TelefoneJaCadastradoError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'atualizar_cliente',
        entidade: 'cliente',
        entidadeId: salvo.id,
        estadoDepois: { nome: salvo.nome, telefone: salvo.telefone },
        ip,
      });
    }

    return salvo;
  }
}
