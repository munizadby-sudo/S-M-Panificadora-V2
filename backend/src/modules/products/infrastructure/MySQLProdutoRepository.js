import { Produto, dinheiro } from '../domain/Produto.js';
import { ProdutoRepository } from '../application/ports.js';
import { NomeDuplicadoNaCategoriaError } from '../domain/erros.js';

export class MySQLProdutoRepository extends ProdutoRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listar({ categoriaId, ativo, busca, page = 1, limit = 20 } = {}) {
    const clausulas = [];
    const params = [];
    if (categoriaId !== undefined) {
      clausulas.push('categoria_id = ?');
      params.push(categoriaId);
    }
    if (ativo !== undefined) {
      clausulas.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }
    if (busca) {
      clausulas.push('nome LIKE ?');
      params.push(`%${busca}%`);
    }
    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM produtos ${where}`,
      params,
    );
    const offset = (page - 1) * limit;
    const [linhas] = await this.pool.query(
      `SELECT * FROM produtos ${where} ORDER BY nome ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: linhas.map(deLinha),
      total: Number(contagem.total) || 0,
    };
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query('SELECT * FROM produtos WHERE id = ? LIMIT 1', [id]);
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async existeNomeNaCategoria(categoriaId, nome, excetoId = null) {
    const params = [categoriaId, nome];
    let sql = 'SELECT id FROM produtos WHERE categoria_id = ? AND nome = ?';
    if (excetoId != null) {
      sql += ' AND id <> ?';
      params.push(excetoId);
    }
    sql += ' LIMIT 1';
    const [linhas] = await this.pool.query(sql, params);
    return linhas.length > 0;
  }

  async salvar(produto) {
    try {
      const [resultado] = await this.pool.query(
        `INSERT INTO produtos (nome, categoria_id, icone, preco, custo, ativo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          produto.nome,
          produto.categoriaId,
          produto.icone,
          produto.preco,
          produto.custo,
          produto.ativo ? 1 : 0,
        ],
      );
      return this.buscarPorId(resultado.insertId);
    } catch (erro) {
      if (Number(erro?.errno) === 1062) {
        throw new NomeDuplicadoNaCategoriaError();
      }
      throw erro;
    }
  }

  async atualizar(produto) {
    try {
      await this.pool.query(
        `UPDATE produtos
            SET nome = ?, categoria_id = ?, icone = ?, preco = ?, custo = ?, ativo = ?
          WHERE id = ?`,
        [
          produto.nome,
          produto.categoriaId,
          produto.icone,
          produto.preco,
          produto.custo,
          produto.ativo ? 1 : 0,
          produto.id,
        ],
      );
      return this.buscarPorId(produto.id);
    } catch (erro) {
      if (Number(erro?.errno) === 1062) {
        throw new NomeDuplicadoNaCategoriaError();
      }
      throw erro;
    }
  }
}

function deLinha(linha) {
  return new Produto({
    id: linha.id,
    nome: linha.nome,
    categoriaId: linha.categoria_id,
    icone: linha.icone,
    preco: dinheiro(linha.preco),
    custo: dinheiro(linha.custo),
    ativo: linha.ativo,
    criadoEm: linha.criado_em,
  });
}
