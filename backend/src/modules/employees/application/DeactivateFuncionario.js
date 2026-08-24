import { FuncionarioNaoEncontradoError } from '../domain/erros.js';

export class DeactivateFuncionario {
  constructor({ funcionarioRepository, auditor }) {
    this.funcionarioRepository = funcionarioRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const funcionario = await this.funcionarioRepository.buscarPorId(Number(id));
    if (!funcionario) {
      throw new FuncionarioNaoEncontradoError();
    }
    if (!funcionario.ativo) {
      return funcionario;
    }

    funcionario.desativar();
    const salvo = await this.funcionarioRepository.atualizar(funcionario);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'desativar_funcionario',
        entidade: 'funcionario',
        entidadeId: salvo.id,
        estadoDepois: { ativo: 0 },
        ip,
      });
    }

    return salvo;
  }
}
