import { FuncionarioNaoEncontradoError } from '../domain/erros.js';

export class ReactivateFuncionario {
  constructor({ funcionarioRepository, auditor }) {
    this.funcionarioRepository = funcionarioRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const funcionario = await this.funcionarioRepository.buscarPorId(Number(id));
    if (!funcionario) {
      throw new FuncionarioNaoEncontradoError();
    }
    if (funcionario.ativo) {
      return funcionario;
    }

    funcionario.reativar();
    const salvo = await this.funcionarioRepository.atualizar(funcionario);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'reativar_funcionario',
        entidade: 'funcionario',
        entidadeId: salvo.id,
        estadoDepois: { ativo: 1 },
        ip,
      });
    }

    return salvo;
  }
}
