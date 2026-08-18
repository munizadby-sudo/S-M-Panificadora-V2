import { Categoria } from '../domain/Categoria.js';
import { CategoriaRepository } from '../application/ports.js';
import { CategoriaJaExisteError } from '../domain/erros.js';

export class MySQLCategoriaRepository extends CategoriaRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listar({ ativo } = {}) {
    const clausulas = [];
    const params = [];
    if (ativo !== undefined) {
      clausulas.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }
    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [linhas] = await this.pool.query(
      `SELECT * FROM categorias ${where} ORDER BY nome ASC`,
      params,
    );
    return linhas.map(deLinha);
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query('SELECT * FROM categorias WHERE id = ? LIMIT 1', [id]);
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async buscarPorNome(nome) {
    const [linhas] = await this.pool.query('SELECT * FROM categorias WHERE nome = ? LIMIT 1', [nome]);
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async existeNomeAtivo(nome, excetoId = null) {
    const params = [nome];
    let sql = 'SELECT id FROM categorias WHERE nome = ?';
    if (excetoId != null) {
      sql += ' AND id <> ?';
      params.push(excetoId);
    }
    sql += ' LIMIT 1';
    const [linhas] = await this.pool.query(sql, params);
    return linhas.length > 0;
  }

  async salvar(categoria) {
    try {
      const [resultado] = await this.pool.query(
        'INSERT INTO categorias (nome, ativo) VALUES (?, ?)',
        [categoria.nome, categoria.ativo ? 1 : 0],
      );
      return this.buscarPorId(resultado.insertId);
    } catch (erro) {
      if (Number(erro?.errno) === 1062) {
        throw new CategoriaJaExisteError();
      }
      throw erro;
    }
  }

  async atualizar(categoria) {
    try {
      await this.pool.query('UPDATE categorias SET nome = ?, ativo = ? WHERE id = ?', [
        categoria.nome,
        categoria.ativo ? 1 : 0,
        categoria.id,
      ]);
      return this.buscarPorId(categoria.id);
    } catch (erro) {
      if (Number(erro?.errno) === 1062) {
        throw new CategoriaJaExisteError();
      }
      throw erro;
    }
  }
}

function deLinha(linha) {
  return new Categoria({
    id: linha.id,
    nome: linha.nome,
    ativo: linha.ativo,
    criadoEm: linha.criado_em,
  });
}
