import { Venda, VendaItem } from '../domain/Venda.js';
import { VendaRepository } from '../application/ports.js';

export class MySQLVendaRepository extends VendaRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async salvar(venda, conexao) {
    const [resultado] = await this.cliente(conexao).query(
      `INSERT INTO vendas (numero, turno_id, usuario_id, forma_pagamento, total, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        venda.numero,
        venda.turnoId,
        venda.usuarioId,
        venda.formaPagamento,
        venda.total,
        venda.status,
      ],
    );
    const vendaId = resultado.insertId;
    for (const item of venda.itens) {
      await this.cliente(conexao).query(
        `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [vendaId, item.produtoId, item.quantidade, item.precoUnitario, item.subtotal],
      );
    }
    return this.buscarPorId(vendaId, conexao);
  }

  async buscarPorId(id, conexao) {
    const [linhas] = await this.cliente(conexao).query('SELECT * FROM vendas WHERE id = ? LIMIT 1', [
      id,
    ]);
    if (!linhas[0]) {
      return null;
    }
    const itens = await this.buscarItensPorVendaId(id, conexao);
    return deLinha(linhas[0], itens);
  }

  async buscarItensPorVendaId(vendaId, conexao) {
    const [linhas] = await this.cliente(conexao).query(
      'SELECT * FROM venda_itens WHERE venda_id = ? ORDER BY id ASC',
      [vendaId],
    );
    return linhas.map(deLinhaItem);
  }

  async atualizar(venda, conexao) {
    await this.cliente(conexao).query(
      `UPDATE vendas
          SET status = ?, motivo_cancelamento = ?, cancelado_por = ?, cancelado_em = ?
        WHERE id = ?`,
      [
        venda.status,
        venda.motivoCancelamento,
        venda.canceladoPor,
        venda.canceladoEm,
        venda.id,
      ],
    );
    return this.buscarPorId(venda.id, conexao);
  }

  async listar(filtros = {}) {
    const clausulas = [];
    const params = [];

    if (filtros.turnoId !== undefined) {
      clausulas.push('turno_id = ?');
      params.push(filtros.turnoId);
    }
    if (filtros.status !== undefined) {
      clausulas.push('status = ?');
      params.push(filtros.status);
    }
    if (filtros.dataInicio !== undefined) {
      clausulas.push('DATE(criado_em) >= ?');
      params.push(filtros.dataInicio);
    }
    if (filtros.dataFim !== undefined) {
      clausulas.push('DATE(criado_em) <= ?');
      params.push(filtros.dataFim);
    }

    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM vendas ${where}`,
      params,
    );

    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;

    const [linhas] = await this.pool.query(
      `SELECT * FROM vendas ${where} ORDER BY criado_em DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const data = [];
    for (const linha of linhas) {
      const itens = await this.buscarItensPorVendaId(linha.id);
      data.push(deLinha(linha, itens));
    }

    return {
      data,
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

function deLinha(linha, itens) {
  return Venda.reconstituir({
    id: linha.id,
    numero: linha.numero,
    turnoId: linha.turno_id,
    usuarioId: linha.usuario_id,
    formaPagamento: linha.forma_pagamento,
    itens,
    total: linha.total,
    status: linha.status,
    motivoCancelamento: linha.motivo_cancelamento,
    canceladoPor: linha.cancelado_por,
    canceladoEm: linha.cancelado_em,
    criadoEm: linha.criado_em,
  });
}

function deLinhaItem(linha) {
  return VendaItem.reconstituir({
    id: linha.id,
    produtoId: linha.produto_id,
    quantidade: linha.quantidade,
    precoUnitario: linha.preco_unitario,
    subtotal: linha.subtotal,
  });
}
