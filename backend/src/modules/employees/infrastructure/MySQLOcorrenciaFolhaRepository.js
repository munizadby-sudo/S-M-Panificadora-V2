import { OcorrenciaFolha } from '../domain/OcorrenciaFolha.js';
import { OcorrenciaFolhaRepository } from '../application/ports.js';

export class MySQLOcorrenciaFolhaRepository extends OcorrenciaFolhaRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async salvar(ocorrencia) {
    const [resultado] = await this.pool.query(
      `INSERT INTO ocorrencias_folha (funcionario_id, tipo, data, valor, motivo, observacao, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ocorrencia.funcionarioId,
        ocorrencia.tipo,
        ocorrencia.data,
        ocorrencia.valor,
        ocorrencia.motivo,
        ocorrencia.observacao,
        ocorrencia.usuarioId,
      ],
    );
    return this.buscarPorId(resultado.insertId);
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query(
      `SELECT o.*, f.nome AS funcionario_nome
         FROM ocorrencias_folha o
         JOIN funcionarios f ON f.id = o.funcionario_id
        WHERE o.id = ?
        LIMIT 1`,
      [id],
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async listar({ funcionarioId, tipo, dataInicio, dataFim, page = 1, limit = 20 } = {}) {
    const clausulas = [];
    const params = [];
    if (funcionarioId !== undefined) {
      clausulas.push('o.funcionario_id = ?');
      params.push(funcionarioId);
    }
    if (tipo !== undefined) {
      clausulas.push('o.tipo = ?');
      params.push(tipo);
    }
    if (dataInicio !== undefined) {
      clausulas.push('o.data >= ?');
      params.push(dataInicio);
    }
    if (dataFim !== undefined) {
      clausulas.push('o.data <= ?');
      params.push(dataFim);
    }
    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM ocorrencias_folha o ${where}`,
      params,
    );
    const offset = (page - 1) * limit;
    const [linhas] = await this.pool.query(
      `SELECT o.*, f.nome AS funcionario_nome
         FROM ocorrencias_folha o
         JOIN funcionarios f ON f.id = o.funcionario_id
         ${where}
         ORDER BY o.data DESC, o.id DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: linhas.map(deLinha),
      total: Number(contagem.total) || 0,
    };
  }

  async somarPorTipoNoPeriodo(funcionarioId, inicio, fim) {
    const [linhas] = await this.pool.query(
      `SELECT tipo, COALESCE(SUM(valor), 0) AS total
         FROM ocorrencias_folha
        WHERE funcionario_id = ? AND data >= ? AND data <= ?
          AND tipo IN ('falta', 'hora_extra', 'nao_cumprimento')
        GROUP BY tipo`,
      [funcionarioId, inicio, fim],
    );
    let faltas = 0;
    let horasExtras = 0;
    let naoCumprimento = 0;
    for (const linha of linhas) {
      if (linha.tipo === 'falta') {
        faltas = Number(linha.total) || 0;
      }
      if (linha.tipo === 'hora_extra') {
        horasExtras = Number(linha.total) || 0;
      }
      if (linha.tipo === 'nao_cumprimento') {
        naoCumprimento = Number(linha.total) || 0;
      }
    }
    return { faltas, horasExtras, naoCumprimento };
  }
}

function deLinha(linha) {
  const item = new OcorrenciaFolha({
    id: linha.id,
    funcionarioId: linha.funcionario_id,
    tipo: linha.tipo,
    data: formatarData(linha.data),
    valor: linha.valor,
    motivo: linha.motivo,
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
