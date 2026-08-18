import { LancamentoFluxoCaixa } from '../domain/LancamentoFluxoCaixa.js';

export class MySQLLancamentoFluxoCaixaRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async salvar(lancamento) {
    const [resultado] = await this.pool.query(
      `INSERT INTO fluxo_caixa
        (usuario_id, turno_id, tipo, descricao, categoria, forma, valor, data, gerado_auto, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        lancamento.usuarioId,
        lancamento.turnoId,
        lancamento.tipo,
        lancamento.descricao,
        lancamento.categoria,
        lancamento.forma,
        lancamento.valor,
        lancamento.data,
      ],
    );
    return this.buscarPorId(resultado.insertId);
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query(
      `SELECT f.*, u.nome AS usuario_nome
         FROM fluxo_caixa f
         LEFT JOIN usuarios u ON u.id = f.usuario_id
        WHERE f.id = ?
        LIMIT 1`,
      [id],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async listar(filtros) {
    const { where, params } = montarWhere(filtros);
    const limite = filtros.limit;
    const offset = (filtros.page - 1) * limite;

    const [contagem] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM fluxo_caixa f ${where}`,
      params,
    );
    const total = Number(contagem[0]?.total || 0);

    const [linhas] = await this.pool.query(
      `SELECT f.*, u.nome AS usuario_nome
         FROM fluxo_caixa f
         LEFT JOIN usuarios u ON u.id = f.usuario_id
        ${where}
        ORDER BY f.criado_em DESC, f.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limite, offset],
    );

    return {
      data: linhas.map((linha) => deLinha(linha).paraListagem({ usuarioNome: linha.usuario_nome })),
      total,
    };
  }

  async marcarExcluido(lancamento) {
    await this.pool.query(
      `UPDATE fluxo_caixa
          SET ativo = 0,
              excluido_por = ?,
              excluido_em = ?,
              motivo_exclusao = ?
        WHERE id = ? AND ativo = 1`,
      [
        lancamento.excluidoPor,
        lancamento.excluidoEm,
        lancamento.motivoExclusao,
        lancamento.id,
      ],
    );
    return this.buscarPorId(lancamento.id);
  }
}

function montarWhere(filtros) {
  const partes = [];
  const params = [];

  if (filtros.ativo !== undefined) {
    partes.push('f.ativo = ?');
    params.push(filtros.ativo ? 1 : 0);
  }
  if (filtros.turnoId !== undefined) {
    partes.push('f.turno_id = ?');
    params.push(filtros.turnoId);
  }
  if (filtros.categoria) {
    partes.push('f.categoria = ?');
    params.push(filtros.categoria);
  }
  if (filtros.tipo) {
    partes.push('f.tipo = ?');
    params.push(filtros.tipo);
  }
  if (filtros.geradoAuto !== undefined) {
    partes.push('f.gerado_auto = ?');
    params.push(filtros.geradoAuto ? 1 : 0);
  }
  if (filtros.dataInicio) {
    partes.push('f.data >= ?');
    params.push(filtros.dataInicio);
  }
  if (filtros.dataFim) {
    partes.push('f.data <= ?');
    params.push(filtros.dataFim);
  }

  const where = partes.length ? `WHERE ${partes.join(' AND ')}` : '';
  return { where, params };
}

function deLinha(linha) {
  return LancamentoFluxoCaixa.reconstituir({
    id: linha.id,
    usuarioId: linha.usuario_id,
    turnoId: linha.turno_id,
    tipo: linha.tipo,
    descricao: linha.descricao,
    categoria: linha.categoria,
    forma: linha.forma,
    valor: linha.valor,
    data: linha.data,
    geradoAuto: linha.gerado_auto,
    ativo: linha.ativo ?? 1,
    vendaId: linha.venda_id,
    criadoEm: linha.criado_em,
    excluidoPor: linha.excluido_por,
    excluidoEm: linha.excluido_em,
    motivoExclusao: linha.motivo_exclusao,
  });
}
