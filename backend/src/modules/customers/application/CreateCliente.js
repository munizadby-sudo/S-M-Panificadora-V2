import { Cliente } from '../domain/Cliente.js';
import { TelefoneJaCadastradoError } from '../domain/erros.js';

export class CreateCliente {
  constructor({ clienteRepository, auditor }) {
    this.clienteRepository = clienteRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const cliente = new Cliente({
      nome: entrada?.nome,
      telefone: entrada?.telefone,
      ativo: true,
    });

    if (await this.clienteRepository.existeTelefoneAtivo(cliente.telefone)) {
      throw new TelefoneJaCadastradoError();
    }

    let salvo;
    try {
      salvo = await this.clienteRepository.salvar(cliente);
    } catch (erro) {
      if (erro instanceof TelefoneJaCadastradoError || ehDuplicidade(erro)) {
        throw new TelefoneJaCadastradoError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_cliente',
        entidade: 'cliente',
        entidadeId: salvo.id,
        estadoDepois: { nome: salvo.nome, telefone: salvo.telefone },
        ip,
      });
    }

    return salvo;
  }
}

export function ehDuplicidade(erro) {
  return Number(erro?.errno) === 1062 || /Duplicate entry/i.test(String(erro?.message || ''));
}
