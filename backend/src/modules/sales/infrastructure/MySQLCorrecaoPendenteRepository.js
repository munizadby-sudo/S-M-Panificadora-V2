import { CorrecaoPendenteRepository } from '../application/ports.js';

export class MySQLCorrecaoPendenteRepository extends CorrecaoPendenteRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listarPendentes() {
    const [linhas] = await this.pool.query(
      `SELECT cp.*, u.nome AS solicitado_por_nome
         FROM correcoes_pendentes cp
         JOIN usuarios u ON u.id = cp.solicitado_por
        WHERE cp.status = 'pendente'
        ORDER BY cp.criado_em ASC`,
    );
    return linhas.map(deLinhaListagem);
  }

  async criar(correcao, conexao) {
    const [resultado] = await this.cliente(conexao).query(
      `INSERT INTO correcoes_pendentes (venda_id, motivo, solicitado_por, status)
       VALUES (?, ?, ?, 'pendente')`,
      [correcao.vendaId, correcao.motivo, correcao.solicitadoPor],
    );
    return this.buscarPorId(resultado.insertId, conexao);
  }

  async buscarPorId(id, conexao) {
    const [linhas] = await this.cliente(conexao).query(
      'SELECT * FROM correcoes_pendentes WHERE id = ? LIMIT 1',
      [id],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async marcarResolvida(id, resolvidoPor, conexao) {
    await this.cliente(conexao).query(
      `UPDATE correcoes_pendentes
          SET status = 'resolvida', resolvido_por = ?, resolvido_em = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pendente'`,
      [resolvidoPor, id],
    );
    return this.buscarPorId(id, conexao);
  }

  cliente(conexao) {
    return conexao || this.pool;
  }
}

function deLinha(linha) {
  return {
    id: linha.id,
    vendaId: linha.venda_id,
    motivo: linha.motivo,
    solicitadoPor: linha.solicitado_por,
    status: linha.status,
    resolvidoPor: linha.resolvido_por,
    resolvidoEm: linha.resolvido_em,
    criadoEm: linha.criado_em,
  };
}

function deLinhaListagem(linha) {
  return {
    id: linha.id,
    venda_id: linha.venda_id,
    motivo: linha.motivo,
    solicitado_por: linha.solicitado_por_nome,
    criado_em: linha.criado_em,
  };
}
