import { Adiantamento } from '../domain/Adiantamento.js';
import { FuncionarioInativoError, FuncionarioNaoEncontradoError } from '../domain/erros.js';

export class CreateAdiantamento {
  constructor({ adiantamentoRepository, funcionarioRepository, auditor }) {
    this.adiantamentoRepository = adiantamentoRepository;
    this.funcionarioRepository = funcionarioRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const funcionarioId = Number(entrada?.funcionario_id ?? entrada?.funcionarioId);
    const funcionario = await this.funcionarioRepository.buscarPorId(funcionarioId);
    if (!funcionario) {
      throw new FuncionarioNaoEncontradoError();
    }
    if (!funcionario.ativo) {
      throw new FuncionarioInativoError();
    }

    const adiantamento = new Adiantamento({
      funcionarioId,
      valor: entrada?.valor,
      data: entrada?.data,
      observacao: entrada?.observacao,
      usuarioId: executor?.id,
    });

    const salvo = await this.adiantamentoRepository.salvar(adiantamento);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_adiantamento',
        entidade: 'adiantamento',
        entidadeId: salvo.id,
        estadoDepois: salvo.paraPublico({ funcionarioNome: funcionario.nome }),
        ip,
      });
    }

    return { adiantamento: salvo, funcionario };
  }
}
