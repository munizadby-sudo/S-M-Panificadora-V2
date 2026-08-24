import { Adiantamento } from '../domain/Adiantamento.js';
import { AdiantamentoRepository } from '../application/ports.js';

export class MySQLAdiantamentoRepository extends AdiantamentoRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async salvar(adiantamento) {
    const [resultado] = await this.pool.query(
      `INSERT INTO adiantamentos (funcionario_id, valor, data, observacao, usuario_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        adiantamento.funcionarioId,
        adiantamento.valor,
        adiantamento.data,
        adiantamento.observacao,
        adiantamento.usuarioId,
      ],
    );
    return this.buscarPorId(resultado.insertId);
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query(
      `SELECT a.*, f.nome AS funcionario_nome
         FROM adiantamentos a
         JOIN funcionarios f ON f.id = a.funcionario_id
        WHERE a.id = ?
        LIMIT 1`,
      [id],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async listar({ funcionarioId, dataInicio, dataFim, page = 1, limit = 20 } = {}) {
    const clausulas = [];
    const params = [];
    if (funcionarioId !== undefined) {
      clausulas.push('a.funcionario_id = ?');
      params.push(funcionarioId);
    }
    if (dataInicio !== undefined) {
      clausulas.push('a.data >= ?');
      params.push(dataInicio);
    }
    if (dataFim !== undefined) {
      clausulas.push('a.data <= ?');
      params.push(dataFim);
    }
    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM adiantamentos a ${where}`,
      params,
    );
    const offset = (page - 1) * limit;
    const [linhas] = await this.pool.query(
      `SELECT a.*, f.nome AS funcionario_nome
         FROM adiantamentos a
         JOIN funcionarios f ON f.id = a.funcionario_id
         ${where}
         ORDER BY a.data DESC, a.id DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: linhas.map(deLinha),
      total: Number(contagem.total) || 0,
    };
  }

  async somarPorFuncionarioNoPeriodo(funcionarioId, inicio, fim) {
    const [[linha]] = await this.pool.query(
      `SELECT COALESCE(SUM(valor), 0) AS total
         FROM adiantamentos
        WHERE funcionario_id = ? AND data >= ? AND data <= ?`,
      [funcionarioId, inicio, fim],
    );
    return Number(linha.total) || 0;
  }
}

function deLinha(linha) {
  const item = new Adiantamento({
    id: linha.id,
    funcionarioId: linha.funcionario_id,
    valor: linha.valor,
    data: formatarData(linha.data),
    observacao: linha.observacao,
    usuarioId: linha.usuario_id,
    criadoEm: linha.criado_em,
  });
  item.funcionarioNome = linha.funcionario_nome ?? null;
  return item;
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
