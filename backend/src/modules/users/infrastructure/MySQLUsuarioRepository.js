import { Usuario } from '../domain/Usuario.js';
import { UsuarioRepository } from '../application/ports.js';

export class MySQLUsuarioRepository extends UsuarioRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async buscarPorUsername(username) {
    const [linhas] = await this.pool.query(
      'SELECT * FROM usuarios WHERE username = ? LIMIT 1',
      [username],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query(
      'SELECT * FROM usuarios WHERE id = ? LIMIT 1',
      [id],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async listar(page = 1, limit = 20) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const offset = (pagina - 1) * limite;

    const [[{ total }]] = await this.pool.query('SELECT COUNT(*) AS total FROM usuarios');
    const [linhas] = await this.pool.query(
      'SELECT * FROM usuarios ORDER BY id ASC LIMIT ? OFFSET ?',
      [limite, offset],
    );

    return { data: linhas.map(deLinha), total: Number(total) };
  }

  async salvar(usuario) {
    const permissoes = JSON.stringify(usuario.permissoes);
    const ativo = usuario.ativo ? 1 : 0;

    if (usuario.id) {
      await this.pool.query(
        `UPDATE usuarios
         SET nome = ?, username = ?, senha_hash = ?, role = ?, permissoes = ?, ativo = ?
         WHERE id = ?`,
        [usuario.nome, usuario.username, usuario.senhaHash, usuario.role, permissoes, ativo, usuario.id],
      );
      return this.buscarPorId(usuario.id);
    }

    const [resultado] = await this.pool.query(
      `INSERT INTO usuarios (nome, username, senha_hash, role, permissoes, ativo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario.nome, usuario.username, usuario.senhaHash, usuario.role, permissoes, ativo],
    );

    return this.buscarPorId(resultado.insertId);
  }
}

function deLinha(linha) {
  return new Usuario({
    id: linha.id,
    nome: linha.nome,
    username: linha.username,
    senhaHash: linha.senha_hash,
    role: linha.role,
    permissoes: parsePermissoes(linha.permissoes),
    ativo: linha.ativo,
    criadoEm: linha.criado_em,
  });
}

function parsePermissoes(valor) {
  if (Array.isArray(valor)) {
    return valor;
  }
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor);
    } catch {
      return [];
    }
  }
  return [];
}
