import { Funcionario } from '../domain/Funcionario.js';
import { FuncionarioNaoEncontradoError } from '../domain/erros.js';

export class UpdateFuncionario {
  constructor({ funcionarioRepository, auditor }) {
    this.funcionarioRepository = funcionarioRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const atual = await this.funcionarioRepository.buscarPorId(Number(entrada?.id));
    if (!atual) {
      throw new FuncionarioNaoEncontradoError();
    }

    const atualizado = new Funcionario({
      id: atual.id,
      nome: entrada?.nome ?? atual.nome,
      cargo: entrada?.cargo ?? atual.cargo,
      salarioBase: entrada?.salario_base ?? entrada?.salarioBase ?? atual.salarioBase,
      dataAdmissao: entrada?.data_admissao ?? entrada?.dataAdmissao ?? atual.dataAdmissao,
      ativo: atual.ativo,
      criadoEm: atual.criadoEm,
    });

    const salvo = await this.funcionarioRepository.atualizar(atualizado);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'atualizar_funcionario',
        entidade: 'funcionario',
        entidadeId: salvo.id,
        estadoAntes: atual.paraPublico(),
        estadoDepois: salvo.paraPublico(),
        ip,
      });
    }

    return salvo;
  }
}
