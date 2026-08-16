import { CredenciaisInvalidasError } from '../domain/erros.js';
import { normalizarUsername } from '../domain/Usuario.js';

export class Login {
  constructor({ usuarioRepository, hashService, tokenService, auditoriaService, auditor }) {
    this.usuarioRepository = usuarioRepository;
    this.hashService = hashService;
    this.tokenService = tokenService;
    this.auditor = auditor || auditoriaService;
  }

  async executar({ username, senha, ip = null }) {
    const usernameNormalizado = normalizarUsername(username);

    try {
      const usuario = await this.usuarioRepository.buscarPorUsername(usernameNormalizado);
      if (!usuario || !usuario.ativo) {
        throw new CredenciaisInvalidasError();
      }

      const senhaOk = await this.hashService.conferir(senha, usuario.senhaHash);
      if (!senhaOk) {
        throw new CredenciaisInvalidasError();
      }

      const token = this.tokenService.emitir(usuario);
      await this.registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'login',
        entidade: 'usuario',
        entidadeId: usuario.id,
        estadoDepois: { username: usernameNormalizado },
        ip,
      });
      return { token, usuario };
    } catch (erro) {
      if (erro instanceof CredenciaisInvalidasError) {
        await this.registrarAuditoria({
          usuarioId: null,
          acao: 'login_falhou',
          entidade: 'usuario',
          entidadeId: null,
          estadoDepois: { username: usernameNormalizado },
          ip,
        });
      }
      throw erro;
    }
  }

  async registrarAuditoria(payload) {
    if (!this.auditor) {
      return;
    }
    await this.auditor.registrar(payload);
  }
}
