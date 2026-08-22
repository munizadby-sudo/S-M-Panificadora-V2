import { Producao } from '../domain/Producao.js';
import { ProducaoRepository } from '../application/ports.js';

export class MySQLProducaoRepository extends ProducaoRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async salvar(producao, conexao) {
    const [resultado] = await this.cliente(conexao).query(
      `INSERT INTO producao (produto_id, data, quantidade, usuario_id)
       VALUES (?, ?, ?, ?)`,
      [producao.produtoId, producao.data, producao.quantidade, producao.usuarioId],
    );
    return this.buscarPorId(resultado.insertId, conexao);
  }

  async buscarPorId(id, conexao) {
    const [linhas] = await this.cliente(conexao).query(
      'SELECT * FROM producao WHERE id = ? LIMIT 1',
      [id],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async listar(filtros = {}) {
    const clausulas = [];
    const params = [];

    if (filtros.produtoId !== undefined) {
      clausulas.push('pr.produto_id = ?');
      params.push(filtros.produtoId);
    }
    if (filtros.dataInicio !== undefined) {
      clausulas.push('pr.data >= ?');
      params.push(filtros.dataInicio);
    }
    if (filtros.dataFim !== undefined) {
      clausulas.push('pr.data <= ?');
      params.push(filtros.dataFim);
    }

    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total
         FROM producao pr
         ${where}`,
      params,
    );

    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;

    const [linhas] = await this.pool.query(
      `SELECT pr.*, p.nome AS produto_nome, u.nome AS usuario_nome
         FROM producao pr
         JOIN produtos p ON p.id = pr.produto_id
         JOIN usuarios u ON u.id = pr.usuario_id
         ${where}
         ORDER BY pr.data DESC, pr.id DESC
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
  return Producao.reconstituir({
    id: linha.id,
    produtoId: linha.produto_id,
    data: formatarData(linha.data),
    quantidade: linha.quantidade,
    usuarioId: linha.usuario_id,
    criadoEm: linha.criado_em,
  });
}

function deLinhaListagem(linha) {
  const producao = deLinha(linha);
  return producao.paraListagem({
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
