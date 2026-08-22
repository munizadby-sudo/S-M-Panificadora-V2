import { Encomenda, EncomendaItem } from '../domain/Encomenda.js';
import { EncomendaRepository } from '../application/ports.js';

export class MySQLEncomendaRepository extends EncomendaRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async salvar(encomenda, conexao) {
    const [resultado] = await this.cliente(conexao).query(
      `INSERT INTO encomendas
        (numero, cliente_id, cliente_nome, cliente_telefone, data_entrega, sinal, observacoes, total, status, ativo, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        encomenda.numero,
        encomenda.clienteId,
        encomenda.clienteNome,
        encomenda.clienteTelefone,
        encomenda.dataEntrega,
        encomenda.sinal,
        encomenda.observacoes,
        encomenda.total,
        encomenda.status,
        encomenda.ativo ? 1 : 0,
        encomenda.usuarioId,
      ],
    );
    const encomendaId = resultado.insertId;
    await this.inserirItens(encomendaId, encomenda.itens, conexao);
    return this.buscarPorId(encomendaId, conexao);
  }

  async inserirItens(encomendaId, itens, conexao) {
    for (const item of itens) {
      await this.cliente(conexao).query(
        `INSERT INTO encomenda_itens (encomenda_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [encomendaId, item.produtoId, item.quantidade, item.precoUnitario, item.subtotal],
      );
    }
  }

  async substituirItens(encomendaId, itens, conexao) {
    await this.cliente(conexao).query('DELETE FROM encomenda_itens WHERE encomenda_id = ?', [encomendaId]);
    await this.inserirItens(encomendaId, itens, conexao);
  }

  async buscarPorId(id, conexao) {
    const [linhas] = await this.cliente(conexao).query(
      'SELECT * FROM encomendas WHERE id = ? LIMIT 1',
      [id],
    );
    if (!linhas[0]) {
      return null;
    }
    const itens = await this.buscarItensPorEncomendaId(id, conexao);
    return deLinha(linhas[0], itens);
  }

  async buscarItensPorEncomendaId(encomendaId, conexao) {
    const [linhas] = await this.cliente(conexao).query(
      'SELECT * FROM encomenda_itens WHERE encomenda_id = ? ORDER BY id ASC',
      [encomendaId],
    );
    return linhas.map(deLinhaItem);
  }

  async atualizar(encomenda, conexao) {
    await this.cliente(conexao).query(
      `UPDATE encomendas
          SET cliente_id = ?, cliente_nome = ?, cliente_telefone = ?, data_entrega = ?,
              sinal = ?, observacoes = ?, total = ?, status = ?, ativo = ?
        WHERE id = ?`,
      [
        encomenda.clienteId,
        encomenda.clienteNome,
        encomenda.clienteTelefone,
        encomenda.dataEntrega,
        encomenda.sinal,
        encomenda.observacoes,
        encomenda.total,
        encomenda.status,
        encomenda.ativo ? 1 : 0,
        encomenda.id,
      ],
    );
    return this.buscarPorId(encomenda.id, conexao);
  }

  async listar(filtros = {}) {
    const clausulas = [];
    const params = [];

    if (filtros.status !== undefined) {
      clausulas.push('status = ?');
      params.push(filtros.status);
    }
    if (filtros.clienteId !== undefined) {
      clausulas.push('cliente_id = ?');
      params.push(filtros.clienteId);
    }
    if (filtros.dataEntregaInicio !== undefined) {
      clausulas.push('data_entrega >= ?');
      params.push(filtros.dataEntregaInicio);
    }
    if (filtros.dataEntregaFim !== undefined) {
      clausulas.push('data_entrega <= ?');
      params.push(filtros.dataEntregaFim);
    }
    if (filtros.ativo !== undefined) {
      clausulas.push('ativo = ?');
      params.push(filtros.ativo ? 1 : 0);
    }

    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM encomendas ${where}`,
      params,
    );

    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;

    const [linhas] = await this.pool.query(
      `SELECT * FROM encomendas ${where} ORDER BY data_entrega ASC, numero ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const data = [];
    for (const linha of linhas) {
      const itens = await this.buscarItensPorEncomendaId(linha.id);
      data.push(deLinha(linha, itens).paraListagem());
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
  return Encomenda.reconstituir({
    id: linha.id,
    numero: linha.numero,
    clienteId: linha.cliente_id,
    clienteNome: linha.cliente_nome,
    clienteTelefone: linha.cliente_telefone,
    dataEntrega: formatarData(linha.data_entrega),
    sinal: linha.sinal,
    observacoes: linha.observacoes,
    itens,
    total: linha.total,
    status: linha.status,
    ativo: linha.ativo,
    usuarioId: linha.usuario_id,
    criadoEm: linha.criado_em,
  });
}

function deLinhaItem(linha) {
  return EncomendaItem.reconstituir({
    id: linha.id,
    produtoId: linha.produto_id,
    quantidade: linha.quantidade,
    precoUnitario: linha.preco_unitario,
    subtotal: linha.subtotal,
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
