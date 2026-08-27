import { CaixaTurno, dinheiro } from '../domain/CaixaTurno.js';
import { FundoNegativoError } from '../domain/erros.js';

export class MySQLCaixaTurnoRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async buscarTurnoAberto() {
    const [linhas] = await this.pool.query(
      `SELECT * FROM caixa_turnos WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`,
    );
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query('SELECT * FROM caixa_turnos WHERE id = ?', [id]);
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async existeParaPeriodo(data, periodo) {
    const [linhas] = await this.pool.query(
      'SELECT id FROM caixa_turnos WHERE data = ? AND periodo = ? LIMIT 1',
      [data, periodo],
    );
    return linhas.length > 0;
  }

  async salvar(turno) {
    if (Number(turno.fundoEspecie) < 0 || Number(turno.fundoMoedas) < 0) {
      throw new FundoNegativoError();
    }
    const [resultado] = await this.pool.query(
      `INSERT INTO caixa_turnos
        (data, periodo, status, aberto_por, fundo_especie, fundo_moedas)
       VALUES (?, ?, 'aberto', ?, ?, ?)`,
      [turno.data, turno.periodo, turno.abertoPor, turno.fundoEspecie, turno.fundoMoedas],
    );
    return this.buscarPorId(resultado.insertId);
  }

  async fecharAtomico(id, dados) {
    const [resultado] = await this.pool.query(
      `UPDATE caixa_turnos SET
        status = 'fechado',
        fechado_por = ?,
        fechado_em = CURRENT_TIMESTAMP,
        esperado_dinheiro = ?, esperado_pix = ?, esperado_cartao = ?,
        contado_dinheiro = ?, contado_pix = ?, contado_cartao = ?, contado_moedas = ?,
        diferenca_dinheiro = ?, diferenca_pix = ?, diferenca_cartao = ?, diferenca_total = ?,
        observacao = ?
       WHERE id = ? AND status = 'aberto'`,
      [
        dados.fechadoPor,
        dados.esperado.dinheiro,
        dados.esperado.pix,
        dados.esperado.cartao,
        dados.contado.dinheiro,
        dados.contado.pix,
        dados.contado.cartao,
        dados.contado.moedas,
        dados.diferenca.dinheiro,
        dados.diferenca.pix,
        dados.diferenca.cartao,
        dados.diferenca.total,
        dados.observacao,
        id,
      ],
    );
    return { afetado: resultado.affectedRows > 0 };
  }

  async listarFechadosNoPeriodo(dataInicio, dataFim) {
    const [linhas] = await this.pool.query(
      `SELECT * FROM caixa_turnos
        WHERE status = 'fechado'
          AND data BETWEEN ? AND ?
        ORDER BY data ASC, periodo ASC, id ASC`,
      [dataInicio, dataFim],
    );
    return linhas.map(deLinha);
  }
}

export class MySQLFluxoCaixaRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async somarPorFormaETurno(turnoId, categorias = ['vendas', 'estorno', 'encomenda']) {
    if (!categorias.length) {
      return [];
    }
    const [linhas] = await this.pool.query(
      'SELECT forma, SUM(CASE WHEN tipo = \'entrada\' THEN valor ELSE -valor END) AS total'
        + ' FROM fluxo_caixa WHERE turno_id = ? AND ativo = 1 AND categoria IN ('
        + listaPlaceholders(parseInt(categorias.length, 10))
        + ') GROUP BY forma',
      [turnoId, ...categorias],
    );
    return linhas.map((linha) => ({ forma: linha.forma, total: dinheiro(linha.total) }));
  }

  async agregarEntradasSaidasPorTurno(turnoId, categorias = ['vendas', 'estorno', 'encomenda']) {
    if (Array.isArray(categorias) && categorias.length === 0) {
      return [];
    }

    const sqlSelect =
      'SELECT forma,'
      + ' SUM(CASE WHEN tipo = \'entrada\' THEN valor ELSE 0 END) AS entradas,'
      + ' SUM(CASE WHEN tipo = \'saida\' THEN valor ELSE 0 END) AS saidas'
      + ' FROM fluxo_caixa WHERE turno_id = ? AND ativo = 1';

    const [linhas] = categorias === null
      ? await this.pool.query(sqlSelect + ' GROUP BY forma', [turnoId])
      : await this.pool.query(
        sqlSelect
          + ' AND categoria IN ('
          + listaPlaceholders(parseInt(categorias.length, 10))
          + ') GROUP BY forma',
        [turnoId, ...categorias],
      );
    return linhas.map((linha) => ({
      forma: linha.forma,
      entradas: dinheiro(linha.entradas),
      saidas: dinheiro(linha.saidas),
    }));
  }

  async registrar(lancamento, conexao) {
    const cliente = conexao || this.pool;
    await cliente.query(
      `INSERT INTO fluxo_caixa
        (usuario_id, turno_id, tipo, descricao, categoria, forma, valor, data, gerado_auto, venda_id, encomenda_id, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        lancamento.usuarioId,
        lancamento.turnoId,
        lancamento.tipo,
        lancamento.descricao,
        lancamento.categoria,
        lancamento.forma,
        lancamento.valor,
        lancamento.data,
        lancamento.geradoAuto ? 1 : 0,
        lancamento.vendaId ?? null,
        lancamento.encomendaId ?? null,
      ],
    );
  }

  async buscarAtivoPorEncomendaId(encomendaId) {
    const lista = await this.listarAtivosPorEncomendaId(encomendaId);
    return lista[0] ?? null;
  }

  async listarAtivosPorEncomendaId(encomendaId) {
    const id = Number(encomendaId);
    if (!Number.isInteger(id) || id <= 0) {
      return [];
    }
    const [linhas] = await this.pool.query(
      `SELECT id, encomenda_id FROM fluxo_caixa
        WHERE encomenda_id = ? AND ativo = 1
        ORDER BY id ASC`,
      [id],
    );
    return linhas.map((linha) => ({ id: linha.id, encomendaId: linha.encomenda_id }));
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
        lancamento.excluidoEm || new Date(),
        lancamento.motivoExclusao || 'Reabertura de encomenda',
        lancamento.id,
      ],
    );
  }
}

function listaPlaceholders(quantidade) {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new Error('quantidade inválida para placeholders SQL');
  }
  return Array.from({ length: quantidade }, () => '?').join(', ');
}

function deLinha(linha) {
  return new CaixaTurno({
    id: linha.id,
    data: formatarData(linha.data),
    periodo: linha.periodo,
    status: linha.status,
    abertoPor: linha.aberto_por,
    abertoEm: linha.aberto_em,
    fundoEspecie: linha.fundo_especie,
    fundoMoedas: linha.fundo_moedas,
    fechadoPor: linha.fechado_por,
    fechadoEm: linha.fechado_em,
    esperado: linha.esperado_dinheiro == null && linha.esperado_pix == null && linha.esperado_cartao == null
      ? null
      : {
          dinheiro: dinheiro(linha.esperado_dinheiro),
          pix: dinheiro(linha.esperado_pix),
          cartao: dinheiro(linha.esperado_cartao),
        },
    contado: linha.contado_dinheiro == null && linha.contado_moedas == null
      ? null
      : {
          dinheiro: dinheiro(linha.contado_dinheiro),
          moedas: dinheiro(linha.contado_moedas),
          pix: dinheiro(linha.contado_pix),
          cartao: dinheiro(linha.contado_cartao),
        },
    diferenca: linha.diferenca_total == null
      ? null
      : {
          dinheiro: dinheiro(linha.diferenca_dinheiro),
          pix: dinheiro(linha.diferenca_pix),
          cartao: dinheiro(linha.diferenca_cartao),
          total: dinheiro(linha.diferenca_total),
        },
    observacao: linha.observacao ?? null,
  });
}

function formatarData(valor) {
  if (!valor) {
    return null;
  }
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  return String(valor).slice(0, 10);
}
