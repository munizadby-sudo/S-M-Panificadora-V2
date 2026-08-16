export class UsuarioRepository {
  async buscarPorUsername(_username) {
    throw new Error('UsuarioRepository.buscarPorUsername não implementado');
  }

  async buscarPorId(_id) {
    throw new Error('UsuarioRepository.buscarPorId não implementado');
  }

  async listar(_page, _limit) {
    throw new Error('UsuarioRepository.listar não implementado');
  }

  async salvar(_usuario) {
    throw new Error('UsuarioRepository.salvar não implementado');
  }
}

export class HashService {
  async hash(_senha) {
    throw new Error('HashService.hash não implementado');
  }

  async conferir(_senha, _senhaHash) {
    throw new Error('HashService.conferir não implementado');
  }
}

export class TokenService {
  emitir(_usuario) {
    throw new Error('TokenService.emitir não implementado');
  }

  verificar(_token) {
    throw new Error('TokenService.verificar não implementado');
  }
}

export class AuditoriaService {
  async registrar(_evento, _dados) {
    throw new Error('AuditoriaService.registrar não implementado');
  }
}
