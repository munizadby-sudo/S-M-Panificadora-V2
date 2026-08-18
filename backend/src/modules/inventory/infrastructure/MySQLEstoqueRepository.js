import { EstoqueDiario, quantidade } from '../domain/EstoqueDiario.js';
import { EstoqueRepository } from '../application/ports.js';

export class MySQLEstoqueRepository extends EstoqueRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async buscarPorProdutoEData(produtoId, data, conexao) {
    const [linhas] = await this.cliente(conexao).query(
      'SELECT * FROM estoque_diario WHERE produto_id = ? AND data = ? LIMIT 1',
      [produtoId, data],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async buscarMaisRecenteAnterior(produtoId, data, conexao) {
    const [linhas] = await this.cliente(conexao).query(
      `SELECT * FROM estoque_diario
        WHERE produto_id = ? AND data < ?
        ORDER BY data DESC
        LIMIT 1`,
      [produtoId, data],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async salvar(estoque, conexao) {
    const [resultado] = await this.cliente(conexao).query(
      `INSERT INTO estoque_diario (produto_id, data, inicial, produzido, vendido, minimo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        estoque.produtoId,
        estoque.data,
        estoque.inicial,
        estoque.produzido,
        estoque.vendido,
        estoque.minimo,
      ],
    );
    return this.buscarPorId(resultado.insertId, conexao);
  }

  async atualizar(estoque, conexao) {
    await this.cliente(conexao).query(
      `UPDATE estoque_diario
          SET inicial = ?, produzido = ?, vendido = ?, minimo = ?
        WHERE id = ?`,
      [estoque.inicial, estoque.produzido, estoque.vendido, estoque.minimo, estoque.id],
    );
    return this.buscarPorId(estoque.id, conexao);
  }

  async bloquearPorProdutoEData(produtoId, data, conexao) {
    if (!conexao) {
      throw new Error('bloquearPorProdutoEData exige conexão de transação');
    }
    const [linhas] = await conexao.query(
      'SELECT * FROM estoque_diario WHERE produto_id = ? AND data = ? FOR UPDATE',
      [produtoId, data],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async comTransacao(fn) {
    const conexao = await this.pool.getConnection();
    await conexao.beginTransaction();
    try {
      const resultado = await fn(conexao);
      await conexao.commit();
      return resultado;
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }
  }

  async buscarPorId(id, conexao) {
    const [linhas] = await this.cliente(conexao).query(
      'SELECT * FROM estoque_diario WHERE id = ? LIMIT 1',
      [id],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  cliente(conexao) {
    return conexao || this.pool;
  }
}

function deLinha(linha) {
  return new EstoqueDiario({
    id: linha.id,
    produtoId: linha.produto_id,
    data: formatarData(linha.data),
    inicial: quantidade(linha.inicial),
    produzido: quantidade(linha.produzido),
    vendido: quantidade(linha.vendido),
    minimo: linha.minimo == null ? null : quantidade(linha.minimo),
    atualizadoEm: linha.atualizado_em,
  });
}

function formatarData(valor) {
  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }
  if (valor instanceof Date) {
    const yyyy = valor.getUTCFullYear();
    const mm = String(valor.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(valor.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(valor).slice(0, 10);
}
