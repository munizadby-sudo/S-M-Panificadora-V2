import mysql from 'mysql2/promise';

export function criarPool(overrides = {}) {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE || 'sm_panificadora',
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    ...overrides,
  });
}

export async function garantirDatabase(nome = process.env.MYSQL_DATABASE || 'sm_panificadora') {
  const conexao = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
  });
  await conexao.query(`CREATE DATABASE IF NOT EXISTS \`${nome}\``);
  await conexao.end();
}

export async function aplicarSchemaUsuarios(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT NOT NULL AUTO_INCREMENT,
      nome VARCHAR(100) NOT NULL,
      username VARCHAR(50) NOT NULL,
      senha_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'operador') NOT NULL DEFAULT 'operador',
      permissoes JSON NOT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY usuarios_username_unique (username)
    )
  `);
}

export async function aplicarSchemaConfiguracoes(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave VARCHAR(50) NOT NULL,
      valor TEXT,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      atualizado_por INT NULL,
      PRIMARY KEY (chave),
      CONSTRAINT configuracoes_atualizado_por_fk
        FOREIGN KEY (atualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);
}

export async function aplicarSchemaCaixaTurnos(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS caixa_turnos (
      id INT NOT NULL AUTO_INCREMENT,
      data DATE NOT NULL,
      periodo ENUM('manha','tarde') NOT NULL,
      status ENUM('aberto','fechado') NOT NULL DEFAULT 'aberto',
      aberto_por INT NOT NULL,
      aberto_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fundo_especie DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      fundo_moedas DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      fechado_por INT NULL,
      fechado_em DATETIME NULL,
      esperado_dinheiro DECIMAL(10,2) NULL,
      esperado_pix DECIMAL(10,2) NULL,
      esperado_cartao DECIMAL(10,2) NULL,
      contado_dinheiro DECIMAL(10,2) NULL,
      contado_pix DECIMAL(10,2) NULL,
      contado_cartao DECIMAL(10,2) NULL,
      contado_moedas DECIMAL(10,2) NULL,
      diferenca_dinheiro DECIMAL(10,2) NULL,
      diferenca_pix DECIMAL(10,2) NULL,
      diferenca_cartao DECIMAL(10,2) NULL,
      diferenca_total DECIMAL(10,2) NULL,
      observacao TEXT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY caixa_turnos_data_periodo (data, periodo),
      CONSTRAINT caixa_turnos_aberto_por_fk FOREIGN KEY (aberto_por) REFERENCES usuarios(id),
      CONSTRAINT caixa_turnos_fechado_por_fk FOREIGN KEY (fechado_por) REFERENCES usuarios(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fluxo_caixa (
      id INT NOT NULL AUTO_INCREMENT,
      usuario_id INT NOT NULL,
      turno_id INT NOT NULL,
      tipo ENUM('entrada','saida') NOT NULL,
      descricao VARCHAR(200) NOT NULL,
      categoria VARCHAR(50) NOT NULL,
      forma VARCHAR(30) NOT NULL,
      valor DECIMAL(10,2) NOT NULL,
      data DATE NOT NULL,
      gerado_auto TINYINT(1) NOT NULL DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY fluxo_caixa_turno (turno_id),
      CONSTRAINT fluxo_caixa_turno_fk FOREIGN KEY (turno_id) REFERENCES caixa_turnos(id),
      CONSTRAINT fluxo_caixa_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
}

export async function aplicarSchemaAuditoria(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INT NOT NULL AUTO_INCREMENT,
      usuario_id INT NULL,
      acao VARCHAR(60) NOT NULL,
      entidade VARCHAR(50) NOT NULL,
      entidade_id INT NULL,
      estado_antes JSON NULL,
      estado_depois JSON NULL,
      ip VARCHAR(45) NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY auditoria_entidade_id (entidade, entidade_id),
      KEY auditoria_usuario_criado (usuario_id, criado_em),
      CONSTRAINT auditoria_usuario_id_fk
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);
}

export async function semearConfiguracoes(pool, padroes) {
  for (const { chave, valor } of padroes) {
    await pool.query(
      `INSERT IGNORE INTO configuracoes (chave, valor, atualizado_por) VALUES (?, ?, NULL)`,
      [chave, valor],
    );
  }
}
