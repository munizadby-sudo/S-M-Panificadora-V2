import { Cliente } from '../domain/Cliente.js';
import { ClienteRepository } from '../application/ports.js';
import { TelefoneJaCadastradoError } from '../domain/erros.js';

export class MySQLClienteRepository extends ClienteRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listar({ ativo, busca, page = 1, limit = 20 } = {}) {
    const clausulas = [];
    const params = [];
    if (ativo !== undefined) {
      clausulas.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }
    if (busca) {
      clausulas.push('(nome LIKE ? OR telefone LIKE ?)');
      const termo = `%${busca}%`;
      params.push(termo, termo);
    }
    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM clientes ${where}`,
      params,
    );
    const offset = (page - 1) * limit;
    const [linhas] = await this.pool.query(
      `SELECT * FROM clientes ${where} ORDER BY nome ASC, id ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: linhas.map(deLinha),
      total: Number(contagem.total) || 0,
    };
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query('SELECT * FROM clientes WHERE id = ? LIMIT 1', [id]);
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async existeTelefoneAtivo(telefone, excetoId = null) {
    const params = [telefone];
    let sql = 'SELECT id FROM clientes WHERE telefone = ? AND ativo = 1';
    if (excetoId != null) {
      sql += ' AND id <> ?';
      params.push(excetoId);
    }
    sql += ' LIMIT 1';
    const [linhas] = await this.pool.query(sql, params);
    return linhas.length > 0;
  }

  async salvar(cliente) {
    try {
      const [resultado] = await this.pool.query(
        `INSERT INTO clientes (nome, telefone, ativo) VALUES (?, ?, ?)`,
        [cliente.nome, cliente.telefone, cliente.ativo ? 1 : 0],
      );
      return this.buscarPorId(resultado.insertId);
    } catch (erro) {
      if (Number(erro?.errno) === 1062) {
        throw new TelefoneJaCadastradoError();
      }
      throw erro;
    }
  }

  async atualizar(cliente) {
    try {
      await this.pool.query(
        `UPDATE clientes SET nome = ?, telefone = ?, ativo = ? WHERE id = ?`,
        [cliente.nome, cliente.telefone, cliente.ativo ? 1 : 0, cliente.id],
      );
      return this.buscarPorId(cliente.id);
    } catch (erro) {
      if (Number(erro?.errno) === 1062) {
        throw new TelefoneJaCadastradoError();
      }
      throw erro;
    }
  }
}

function deLinha(linha) {
  return new Cliente({
    id: linha.id,
    nome: linha.nome,
    telefone: linha.telefone,
    ativo: linha.ativo,
    criadoEm: linha.criado_em,
  });
}
