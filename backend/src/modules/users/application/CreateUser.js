import { Usuario } from '../domain/Usuario.js';
import { CamposObrigatoriosError, UsuarioJaExisteError } from '../domain/erros.js';
import { normalizarUsername } from '../domain/Usuario.js';

export class CreateUser {
  constructor({ usuarioRepository, hashService, auditoriaService, auditor }) {
    this.usuarioRepository = usuarioRepository;
    this.hashService = hashService;
    this.auditor = auditor || auditoriaService;
  }

  async executar({ nome, username, senha, role, permissoes }, executor) {
    validarObrigatorios({ nome, username, senha });

    const usernameNormalizado = normalizarUsername(username);
    const existente = await this.usuarioRepository.buscarPorUsername(usernameNormalizado);
    if (existente) {
      throw new UsuarioJaExisteError();
    }

    const senhaHash = await this.hashService.hash(senha);
    const usuario = new Usuario({
      nome: String(nome).trim(),
      username: usernameNormalizado,
      senhaHash,
      role,
      permissoes,
      ativo: true,
    });

    const salvo = await this.usuarioRepository.salvar(usuario);
    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id ?? salvo.id,
        acao: 'criar_usuario',
        entidade: 'usuario',
        entidadeId: salvo.id,
        estadoDepois: { username: salvo.username },
      });
    }
    return salvo;
  }
}

function validarObrigatorios({ nome, username, senha }) {
  if (!String(nome ?? '').trim() || !String(username ?? '').trim() || !String(senha ?? '')) {
    throw new CamposObrigatoriosError('Informe nome, usuário e senha.');
  }
}
