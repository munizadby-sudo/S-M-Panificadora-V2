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
}

export class MySQLFluxoCaixaRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async somarPorFormaETurno(turnoId, categorias = ['vendas', 'estorno']) {
    if (!categorias.length) {
      return [];
    }
    const placeholders = categorias.map(() => '?').join(', ');
    const [linhas] = await this.pool.query(
      `SELECT forma,
              SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) AS total
         FROM fluxo_caixa
        WHERE turno_id = ? AND categoria IN (${placeholders})
        GROUP BY forma`,
      [turnoId, ...categorias],
    );
    return linhas.map((linha) => ({ forma: linha.forma, total: dinheiro(linha.total) }));
  }
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
