import { UsuarioNaoEncontradoError } from '../domain/erros.js';

export class DeactivateUser {
  constructor({ usuarioRepository, auditoriaService, auditor }) {
    this.usuarioRepository = usuarioRepository;
    this.auditor = auditor || auditoriaService;
  }

  async executar({ usuarioAlvoId }, executor) {
    const alvo = await this.usuarioRepository.buscarPorId(usuarioAlvoId);
    if (!alvo) {
      throw new UsuarioNaoEncontradoError();
    }

    alvo.desativarPor(executor.id);
    const salvo = await this.usuarioRepository.salvar(alvo);
    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor.id,
        acao: 'desativar_usuario',
        entidade: 'usuario',
        entidadeId: salvo.id,
      });
    }
    return salvo;
  }
}
