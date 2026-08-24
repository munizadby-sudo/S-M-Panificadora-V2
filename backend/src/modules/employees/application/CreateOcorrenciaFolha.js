import { OcorrenciaFolha } from '../domain/OcorrenciaFolha.js';
import { FuncionarioInativoError, FuncionarioNaoEncontradoError } from '../domain/erros.js';

export class CreateOcorrenciaFolha {
  constructor({ ocorrenciaFolhaRepository, funcionarioRepository, auditor }) {
    this.ocorrenciaFolhaRepository = ocorrenciaFolhaRepository;
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

    const ocorrencia = new OcorrenciaFolha({
      funcionarioId,
      tipo: entrada?.tipo,
      data: entrada?.data,
      valor: entrada?.valor,
      observacao: entrada?.observacao,
      usuarioId: executor?.id,
    });

    const salva = await this.ocorrenciaFolhaRepository.salvar(ocorrencia);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'criar_ocorrencia_folha',
        entidade: 'ocorrencia_folha',
        entidadeId: salva.id,
        estadoDepois: salva.paraPublico({ funcionarioNome: funcionario.nome }),
        ip,
      });
    }

    return { ocorrencia: salva, funcionario };
  }
}
