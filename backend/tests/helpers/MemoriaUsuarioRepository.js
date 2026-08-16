import { UsuarioRepository } from '../../src/modules/users/application/ports.js';

export class MemoriaUsuarioRepository extends UsuarioRepository {
  constructor(usuarios = []) {
    super();
    this.usuarios = [...usuarios];
    this.proximoId = 1 + this.usuarios.reduce((max, item) => Math.max(max, item.id || 0), 0);
  }

  async buscarPorUsername(username) {
    return this.usuarios.find((item) => item.username === username) ?? null;
  }

  async buscarPorId(id) {
    return this.usuarios.find((item) => item.id === Number(id)) ?? null;
  }

  async listar(page = 1, limit = 20) {
    const inicio = (page - 1) * limit;
    return {
      data: this.usuarios.slice(inicio, inicio + limit),
      total: this.usuarios.length,
    };
  }

  async salvar(usuario) {
    if (usuario.id) {
      const indice = this.usuarios.findIndex((item) => item.id === usuario.id);
      this.usuarios[indice] = usuario;
      return usuario;
    }

    usuario.id = this.proximoId;
    this.proximoId += 1;
    this.usuarios.push(usuario);
    return usuario;
  }
}
