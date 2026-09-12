import { SequenciaRepository } from '../application/ports.js';

export class MySQLSequenciaRepository extends SequenciaRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async proximoNumero(chave, conexao) {
    if (conexao) {
      return this.avancarNaConexao(chave, conexao);
    }
    const propria = await this.pool.getConnection();
    try {
      await propria.beginTransaction();
      const numero = await this.avancarNaConexao(chave, propria);
      await propria.commit();
      return numero;
    } catch (erro) {
      await propria.rollback();
      throw erro;
    } finally {
      propria.release();
    }
  }

  async avancarNaConexao(chave, cliente) {
    await cliente.query(
      'INSERT INTO sequencias (chave, valor) VALUES (?, 0) ON DUPLICATE KEY UPDATE chave = chave',
      [chave],
    );
    await cliente.query('UPDATE sequencias SET valor = valor + 1 WHERE chave = ?', [chave]);
    const [linhas] = await cliente.query(
      'SELECT valor AS numero FROM sequencias WHERE chave = ?',
      [chave],
    );
    return Number(linhas[0].numero);
  }
}
