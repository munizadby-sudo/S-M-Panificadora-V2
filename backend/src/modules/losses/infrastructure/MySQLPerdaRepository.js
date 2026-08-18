import { Perda } from '../domain/Perda.js';
import { PerdaRepository } from '../application/ports.js';

export class MySQLPerdaRepository extends PerdaRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async salvar(perda, conexao) {
    const [resultado] = await this.cliente(conexao).query(
      `INSERT INTO perdas (produto_id, data, quantidade, motivo, custo_calculado, usuario_id, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        perda.produtoId,
        perda.data,
        perda.quantidade,
        perda.motivo,
        perda.custoCalculado,
        perda.usuarioId,
        perda.ativo ? 1 : 0,
      ],
    );
    return this.buscarPorId(resultado.insertId, conexao);
  }

  async buscarPorId(id, conexao) {
    const [linhas] = await this.cliente(conexao).query('SELECT * FROM perdas WHERE id = ? LIMIT 1', [
      id,
    ]);
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async atualizar(perda, conexao) {
    await this.cliente(conexao).query('UPDATE perdas SET ativo = ? WHERE id = ?', [
      perda.ativo ? 1 : 0,
      perda.id,
    ]);
    return this.buscarPorId(perda.id, conexao);
  }

  async listar(filtros = {}) {
    const clausulas = [];
    const params = [];

    if (filtros.produtoId !== undefined) {
      clausulas.push('p.produto_id = ?');
      params.push(filtros.produtoId);
    }
    if (filtros.motivo !== undefined) {
      clausulas.push('p.motivo = ?');
      params.push(filtros.motivo);
    }
    if (filtros.dataInicio !== undefined) {
      clausulas.push('p.data >= ?');
      params.push(filtros.dataInicio);
    }
    if (filtros.dataFim !== undefined) {
      clausulas.push('p.data <= ?');
      params.push(filtros.dataFim);
    }
    if (filtros.ativo !== undefined) {
      clausulas.push('p.ativo = ?');
      params.push(filtros.ativo ? 1 : 0);
    }

    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total
         FROM perdas p
         ${where}`,
      params,
    );

    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;

    const [linhas] = await this.pool.query(
      `SELECT p.*, pr.nome AS produto_nome, u.nome AS usuario_nome
         FROM perdas p
         JOIN produtos pr ON pr.id = p.produto_id
         JOIN usuarios u ON u.id = p.usuario_id
         ${where}
         ORDER BY p.data DESC, p.id DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      data: linhas.map(deLinhaListagem),
      total: Number(contagem.total) || 0,
    };
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

  cliente(conexao) {
    return conexao || this.pool;
  }
}

function deLinha(linha) {
  return Perda.reconstituir({
    id: linha.id,
    produtoId: linha.produto_id,
    data: formatarData(linha.data),
    quantidade: linha.quantidade,
    motivo: linha.motivo,
    custoCalculado: linha.custo_calculado,
    usuarioId: linha.usuario_id,
    ativo: linha.ativo,
    criadoEm: linha.criado_em,
  });
}

function deLinhaListagem(linha) {
  const perda = deLinha(linha);
  return perda.paraListagem({
    produtoNome: linha.produto_nome,
    usuarioNome: linha.usuario_nome,
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
