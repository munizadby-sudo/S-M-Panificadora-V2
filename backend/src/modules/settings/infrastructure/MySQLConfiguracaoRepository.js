export class MySQLConfiguracaoRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listar() {
    const [linhas] = await this.pool.query(
      'SELECT chave, valor, atualizado_em, atualizado_por FROM configuracoes',
    );
    return linhas;
  }

  async upsert(chave, valor, atualizadoPor) {
    await this.pool.query(
      `INSERT INTO configuracoes (chave, valor, atualizado_por)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), atualizado_por = VALUES(atualizado_por)`,
      [chave, valor == null ? '' : String(valor), atualizadoPor],
    );
  }
}
