import { SequenciaRepository } from '../application/ports.js';

export class MySQLSequenciaRepository extends SequenciaRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async proximoNumero(chave, conexao) {
    const cliente = conexao || this.pool;
    await cliente.query(
      `INSERT INTO sequencias (chave, valor) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE valor = LAST_INSERT_ID(valor + 1)`,
      [chave],
    );
    const [[linha]] = await cliente.query('SELECT LAST_INSERT_ID() AS numero');
    return Number(linha.numero);
  }
}
