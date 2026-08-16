export class MySQLAuditoriaRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async inserir({ usuarioId, acao, entidade, entidadeId, estadoAntes, estadoDepois, ip }) {
    await this.pool.query(
      `INSERT INTO auditoria
        (usuario_id, acao, entidade, entidade_id, estado_antes, estado_depois, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        acao,
        entidade,
        entidadeId,
        serializarJson(estadoAntes),
        serializarJson(estadoDepois),
        ip,
      ],
    );
  }

  async listar({ entidade, entidadeId, usuarioId, acao, dataInicio, dataFim, page = 1, limit = 20 } = {}) {
    const where = [];
    const params = [];

    if (entidade) {
      where.push('entidade = ?');
      params.push(entidade);
    }
    if (entidadeId !== undefined && entidadeId !== null && entidadeId !== '') {
      where.push('entidade_id = ?');
      params.push(Number(entidadeId));
    }
    if (usuarioId !== undefined && usuarioId !== null && usuarioId !== '') {
      where.push('usuario_id = ?');
      params.push(Number(usuarioId));
    }
    if (acao) {
      where.push('acao = ?');
      params.push(acao);
    }
    if (dataInicio) {
      where.push('criado_em >= ?');
      params.push(dataInicio);
    }
    if (dataFim) {
      where.push('criado_em <= ?');
      params.push(dataFim);
    }

    const filtro = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const offset = (pagina - 1) * limite;

    const [[{ total }]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM auditoria ${filtro}`,
      params,
    );
    const [linhas] = await this.pool.query(
      `SELECT id, usuario_id, acao, entidade, entidade_id, ip, criado_em
         FROM auditoria
         ${filtro}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
      [...params, limite, offset],
    );

    return {
      total: Number(total),
      data: linhas.map((linha) => ({
        id: linha.id,
        usuarioId: linha.usuario_id,
        acao: linha.acao,
        entidade: linha.entidade,
        entidadeId: linha.entidade_id,
        ip: linha.ip,
        criadoEm: linha.criado_em,
      })),
    };
  }
}

function serializarJson(valor) {
  if (valor == null) {
    return null;
  }
  return JSON.stringify(valor);
}
