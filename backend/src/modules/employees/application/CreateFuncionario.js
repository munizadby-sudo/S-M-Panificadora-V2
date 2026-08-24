import { Funcionario } from '../domain/Funcionario.js';

export class CreateFuncionario {
  constructor({ funcionarioRepository, auditor }) {
    this.funcionarioRepository = funcionarioRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const funcionario = new Funcionario({
      nome: entrada?.nome,
      cargo: entrada?.cargo,
      salarioBase: entrada?.salario_base ?? entrada?.salarioBase,
      dataAdmissao: entrada?.data_admissao ?? entrada?.dataAdmissao,
      ativo: true,
    });

    const salvo = await this.funcionarioRepository.salvar(funcionario);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_funcionario',
        entidade: 'funcionario',
        entidadeId: salvo.id,
        estadoDepois: salvo.paraPublico(),
        ip,
      });
    }

    return salvo;
  }
}
