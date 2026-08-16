import { Usuario } from '../domain/Usuario.js';
import { CamposObrigatoriosError, UsuarioJaExisteError, UsuarioNaoEncontradoError } from '../domain/erros.js';
import { normalizarUsername } from '../domain/Usuario.js';

export class UpdateUser {
  constructor({ usuarioRepository, hashService, auditoriaService, auditor }) {
    this.usuarioRepository = usuarioRepository;
    this.hashService = hashService;
    this.auditor = auditor || auditoriaService;
  }

  async executar({ id, nome, username, senha, role, permissoes }, _executor) {
    const atual = await this.usuarioRepository.buscarPorId(id);
    if (!atual) {
      throw new UsuarioNaoEncontradoError();
    }

    if (!String(nome ?? '').trim() || !String(username ?? '').trim()) {
      throw new CamposObrigatoriosError('Informe nome e usuário.');
    }

    const usernameNormalizado = normalizarUsername(username);
    const conflito = await this.usuarioRepository.buscarPorUsername(usernameNormalizado);
    if (conflito && conflito.id !== Number(id)) {
      throw new UsuarioJaExisteError();
    }

    const senhaHash = senha
      ? await this.hashService.hash(senha)
      : atual.senhaHash;

    const atualizado = new Usuario({
      id: atual.id,
      nome: String(nome).trim(),
      username: usernameNormalizado,
      senhaHash,
      role,
      permissoes,
      ativo: atual.ativo,
      criadoEm: atual.criadoEm,
    });

    const salvo = await this.usuarioRepository.salvar(atualizado);
    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: _executor?.id ?? salvo.id,
        acao: 'atualizar_usuario',
        entidade: 'usuario',
        entidadeId: salvo.id,
      });
    }
    return salvo;
  }
}
