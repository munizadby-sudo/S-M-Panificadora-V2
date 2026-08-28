import { FolhaPagamento } from '../domain/FolhaPagamento.js';
import { FolhaPagamentoRepository } from '../application/ports.js';

export class MySQLFolhaPagamentoRepository extends FolhaPagamentoRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async salvar(folha) {
    const [resultado] = await this.pool.query(
      `INSERT INTO folhas_pagamento (
         funcionario_id, periodo_inicio, periodo_fim, salario_base,
         total_adiantamentos, total_faltas, total_horas_extras, total_nao_cumprimento, valor_liquido,
         status, pago_em, usuario_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        folha.funcionarioId,
        folha.periodoInicio,
        folha.periodoFim,
        folha.salarioBase,
        folha.totalAdiantamentos,
        folha.totalFaltas,
        folha.totalHorasExtras,
        folha.totalNaoCumprimento,
        folha.valorLiquido,
        folha.status,
        folha.pagoEm,
        folha.usuarioId,
      ],
    );
    return this.buscarPorId(resultado.insertId);
  }

  async atualizar(folha) {
    await this.pool.query(
      `UPDATE folhas_pagamento
          SET status = ?, pago_em = ?
        WHERE id = ?`,
      [folha.status, folha.pagoEm, folha.id],
    );
    return this.buscarPorId(folha.id);
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query(
      `SELECT fp.*, f.nome AS funcionario_nome
         FROM folhas_pagamento fp
         JOIN funcionarios f ON f.id = fp.funcionario_id
        WHERE fp.id = ?
        LIMIT 1`,
      [id],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async buscarPorFuncionarioEPeriodo(funcionarioId, inicio, fim) {
    const [linhas] = await this.pool.query(
      `SELECT fp.*, f.nome AS funcionario_nome
         FROM folhas_pagamento fp
         JOIN funcionarios f ON f.id = fp.funcionario_id
        WHERE fp.funcionario_id = ? AND fp.periodo_inicio = ? AND fp.periodo_fim = ?
        LIMIT 1`,
      [funcionarioId, inicio, fim],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async listar({
    funcionarioId,
    status,
    periodoInicio,
    periodoFim,
    page = 1,
    limit = 20,
  } = {}) {
    const clausulas = [];
    const params = [];
    if (funcionarioId !== undefined) {
      clausulas.push('fp.funcionario_id = ?');
      params.push(funcionarioId);
    }
    if (status !== undefined) {
      clausulas.push('fp.status = ?');
      params.push(status);
    }
    if (periodoInicio !== undefined) {
      clausulas.push('fp.periodo_inicio >= ?');
      params.push(periodoInicio);
    }
    if (periodoFim !== undefined) {
      clausulas.push('fp.periodo_fim <= ?');
      params.push(periodoFim);
    }
    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM folhas_pagamento fp ${where}`,
      params,
    );
    const offset = (page - 1) * limit;
    const [linhas] = await this.pool.query(
      `SELECT fp.*, f.nome AS funcionario_nome
         FROM folhas_pagamento fp
         JOIN funcionarios f ON f.id = fp.funcionario_id
         ${where}
         ORDER BY fp.periodo_inicio DESC, fp.id DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: linhas.map(deLinha),
      total: Number(contagem.total) || 0,
    };
  }
}

function deLinha(linha) {
  const item = new FolhaPagamento({
    id: linha.id,
    funcionarioId: linha.funcionario_id,
    periodoInicio: formatarData(linha.periodo_inicio),
    periodoFim: formatarData(linha.periodo_fim),
    salarioBase: linha.salario_base,
    totalAdiantamentos: linha.total_adiantamentos,
    totalFaltas: linha.total_faltas,
    totalHorasExtras: linha.total_horas_extras,
    totalNaoCumprimento: linha.total_nao_cumprimento ?? 0,
    valorLiquido: linha.valor_liquido,
    status: linha.status,
    pagoEm: linha.pago_em,
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
