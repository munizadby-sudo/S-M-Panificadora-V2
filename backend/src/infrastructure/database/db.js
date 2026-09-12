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
  await conexao.query('CREATE DATABASE IF NOT EXISTS ??', [nome]);
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

export async function aplicarSchemaProdutos(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INT NOT NULL AUTO_INCREMENT,
      nome VARCHAR(60) NOT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      nome_unico_ativo VARCHAR(60) GENERATED ALWAYS AS (IF(ativo = 1, nome, NULL)) STORED,
      PRIMARY KEY (id),
      UNIQUE KEY categorias_nome_unique (nome)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INT NOT NULL AUTO_INCREMENT,
      nome VARCHAR(100) NOT NULL,
      categoria_id INT NOT NULL,
      icone VARCHAR(10) NULL,
      preco DECIMAL(10,2) NOT NULL,
      custo DECIMAL(10,2) NOT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      nome_unico_ativo VARCHAR(100) GENERATED ALWAYS AS (IF(ativo = 1, nome, NULL)) STORED,
      PRIMARY KEY (id),
      UNIQUE KEY produtos_categoria_nome_unique (categoria_id, nome),
      CONSTRAINT produtos_categoria_id_fk
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    )
  `);
  await migrarUnicidadeAtivaProdutos(pool);
}

export async function aplicarSchemaEstoque(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS estoque_diario (
      id INT NOT NULL AUTO_INCREMENT,
      produto_id INT NOT NULL,
      data DATE NOT NULL,
      inicial DECIMAL(10,3) NOT NULL DEFAULT 0,
      produzido DECIMAL(10,3) NOT NULL DEFAULT 0,
      vendido DECIMAL(10,3) NOT NULL DEFAULT 0,
      minimo DECIMAL(10,3) NULL,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY estoque_diario_produto_data (produto_id, data),
      CONSTRAINT estoque_diario_produto_id_fk
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);
}

export async function aplicarSchemaPerdas(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS perdas (
      id INT NOT NULL AUTO_INCREMENT,
      produto_id INT NOT NULL,
      data DATE NOT NULL,
      quantidade DECIMAL(10,3) NOT NULL,
      motivo ENUM('queimado','vencido','danificado','sobra') NOT NULL,
      custo_calculado DECIMAL(10,2) NOT NULL,
      usuario_id INT NOT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY perdas_produto_data (produto_id, data),
      KEY perdas_data (data),
      CONSTRAINT perdas_produto_id_fk
        FOREIGN KEY (produto_id) REFERENCES produtos(id),
      CONSTRAINT perdas_usuario_id_fk
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
}

export async function aplicarSchemaProducao(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS producao (
      id INT NOT NULL AUTO_INCREMENT,
      produto_id INT NOT NULL,
      data DATE NOT NULL,
      quantidade DECIMAL(10,3) NOT NULL,
      usuario_id INT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY producao_produto_data (produto_id, data),
      KEY producao_data (data),
      CONSTRAINT producao_produto_id_fk
        FOREIGN KEY (produto_id) REFERENCES produtos(id),
      CONSTRAINT producao_usuario_id_fk
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
}

export async function aplicarSchemaVendas(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sequencias (
      chave VARCHAR(30) NOT NULL,
      valor INT NOT NULL DEFAULT 0,
      PRIMARY KEY (chave)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendas (
      id INT NOT NULL AUTO_INCREMENT,
      numero INT NOT NULL,
      turno_id INT NOT NULL,
      usuario_id INT NOT NULL,
      forma_pagamento ENUM('dinheiro','pix','cartao','credito') NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status ENUM('confirmada','cancelada') NOT NULL DEFAULT 'confirmada',
      motivo_cancelamento TEXT NULL,
      cancelado_por INT NULL,
      cancelado_em DATETIME NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY vendas_numero_unique (numero),
      KEY vendas_turno_id (turno_id),
      KEY vendas_criado_em (criado_em),
      CONSTRAINT vendas_turno_id_fk FOREIGN KEY (turno_id) REFERENCES caixa_turnos(id),
      CONSTRAINT vendas_usuario_id_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      CONSTRAINT vendas_cancelado_por_fk FOREIGN KEY (cancelado_por) REFERENCES usuarios(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS venda_itens (
      id INT NOT NULL AUTO_INCREMENT,
      venda_id INT NOT NULL,
      produto_id INT NOT NULL,
      quantidade DECIMAL(10,3) NOT NULL,
      preco_unitario DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (id),
      KEY venda_itens_venda_id (venda_id),
      CONSTRAINT venda_itens_venda_id_fk FOREIGN KEY (venda_id) REFERENCES vendas(id),
      CONSTRAINT venda_itens_produto_id_fk FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS venda_pagamentos (
      id INT NOT NULL AUTO_INCREMENT,
      venda_id INT NOT NULL,
      forma_pagamento ENUM('dinheiro','pix','cartao','credito') NOT NULL,
      valor DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (id),
      KEY venda_pagamentos_venda_id (venda_id),
      CONSTRAINT venda_pagamentos_venda_id_fk FOREIGN KEY (venda_id) REFERENCES vendas(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS correcoes_pendentes (
      id INT NOT NULL AUTO_INCREMENT,
      venda_id INT NOT NULL,
      motivo TEXT NOT NULL,
      solicitado_por INT NOT NULL,
      status ENUM('pendente','resolvida') NOT NULL DEFAULT 'pendente',
      resolvido_por INT NULL,
      resolvido_em DATETIME NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY correcoes_pendentes_status (status),
      CONSTRAINT correcoes_venda_id_fk FOREIGN KEY (venda_id) REFERENCES vendas(id),
      CONSTRAINT correcoes_solicitado_por_fk FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
      CONSTRAINT correcoes_resolvido_por_fk FOREIGN KEY (resolvido_por) REFERENCES usuarios(id)
    )
  `);
  await garantirColuna(pool, 'fluxo_caixa', 'venda_id', 'INT NULL');
  await garantirColuna(pool, 'fluxo_caixa', 'encomenda_id', 'INT NULL');
}

export async function aplicarSchemaEncomendas(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS encomendas (
      id INT NOT NULL AUTO_INCREMENT,
      numero INT NOT NULL,
      cliente_id INT NULL,
      cliente_nome VARCHAR(100) NOT NULL,
      cliente_telefone VARCHAR(20) NOT NULL,
      data_entrega DATE NOT NULL,
      sinal DECIMAL(10,2) NOT NULL DEFAULT 0,
      observacoes TEXT NULL,
      total DECIMAL(10,2) NOT NULL,
      status ENUM('pendente','pronto','entregue') NOT NULL DEFAULT 'pendente',
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      usuario_id INT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY encomendas_numero_unique (numero),
      KEY encomendas_status (status),
      KEY encomendas_cliente_id (cliente_id),
      KEY encomendas_data_entrega (data_entrega),
      CONSTRAINT encomendas_cliente_id_fk
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      CONSTRAINT encomendas_usuario_id_fk
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS encomenda_itens (
      id INT NOT NULL AUTO_INCREMENT,
      encomenda_id INT NOT NULL,
      produto_id INT NOT NULL,
      quantidade DECIMAL(10,3) NOT NULL,
      preco_unitario DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (id),
      KEY encomenda_itens_encomenda_id (encomenda_id),
      CONSTRAINT encomenda_itens_encomenda_id_fk FOREIGN KEY (encomenda_id) REFERENCES encomendas(id),
      CONSTRAINT encomenda_itens_produto_id_fk FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);
}

export async function aplicarSchemaClientes(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INT NOT NULL AUTO_INCREMENT,
      nome VARCHAR(100) NOT NULL,
      telefone VARCHAR(20) NOT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      telefone_unico_ativo VARCHAR(20) GENERATED ALWAYS AS (IF(ativo = 1, telefone, NULL)) STORED,
      PRIMARY KEY (id),
      UNIQUE KEY clientes_telefone_ativo_unique (telefone_unico_ativo)
    )
  `);
}

export async function aplicarSchemaFuncionarios(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS funcionarios (
      id INT NOT NULL AUTO_INCREMENT,
      nome VARCHAR(100) NOT NULL,
      cargo VARCHAR(60) NOT NULL,
      salario_base DECIMAL(10,2) NOT NULL,
      periodicidade ENUM('mensal','quinzenal') NOT NULL DEFAULT 'mensal',
      data_admissao DATE NOT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS adiantamentos (
      id INT NOT NULL AUTO_INCREMENT,
      funcionario_id INT NOT NULL,
      valor DECIMAL(10,2) NOT NULL,
      data DATE NOT NULL,
      observacao TEXT NULL,
      usuario_id INT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_adiantamentos_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id),
      CONSTRAINT fk_adiantamentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ocorrencias_folha (
      id INT NOT NULL AUTO_INCREMENT,
      funcionario_id INT NOT NULL,
      tipo ENUM('falta','atestado','hora_extra','nao_cumprimento') NOT NULL,
      data DATE NOT NULL,
      valor DECIMAL(10,2) NOT NULL DEFAULT 0,
      motivo VARCHAR(40) NULL,
      observacao TEXT NULL,
      usuario_id INT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_ocorrencias_folha_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id),
      CONSTRAINT fk_ocorrencias_folha_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folhas_pagamento (
      id INT NOT NULL AUTO_INCREMENT,
      funcionario_id INT NOT NULL,
      periodo_inicio DATE NOT NULL,
      periodo_fim DATE NOT NULL,
      salario_base DECIMAL(10,2) NOT NULL,
      total_adiantamentos DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_faltas DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_horas_extras DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_nao_cumprimento DECIMAL(10,2) NOT NULL DEFAULT 0,
      valor_liquido DECIMAL(10,2) NOT NULL,
      status ENUM('pendente','paga') NOT NULL DEFAULT 'pendente',
      pago_em DATETIME NULL,
      usuario_id INT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY folhas_pagamento_funcionario_periodo_unique (funcionario_id, periodo_inicio, periodo_fim),
      CONSTRAINT fk_folhas_pagamento_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id),
      CONSTRAINT fk_folhas_pagamento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  await garantirEnumTipoOcorrencia(pool);
  await garantirColuna(pool, 'ocorrencias_folha', 'motivo', 'VARCHAR(40) NULL');
  await garantirColuna(
    pool,
    'folhas_pagamento',
    'total_nao_cumprimento',
    'DECIMAL(10,2) NOT NULL DEFAULT 0',
  );

  const jaTinhaPeriodicidade = await temColuna(pool, 'funcionarios', 'periodicidade');
  await garantirColuna(
    pool,
    'funcionarios',
    'periodicidade',
    "ENUM('mensal','quinzenal') NOT NULL DEFAULT 'mensal'",
  );
  if (!jaTinhaPeriodicidade) {
    await pool.query(
      `UPDATE funcionarios
          SET periodicidade = 'quinzenal'
        WHERE LOWER(TRIM(cargo)) IN ('padeiro','padeira','padeiros','padeiras','ajudante','ajudantes')`,
    );
  }
}

export async function aplicarSchemaFluxoCaixa(pool) {
  await garantirColuna(pool, 'fluxo_caixa', 'ativo', 'TINYINT(1) NOT NULL DEFAULT 1');
  await garantirColuna(pool, 'fluxo_caixa', 'excluido_por', 'INT NULL');
  await garantirColuna(pool, 'fluxo_caixa', 'excluido_em', 'DATETIME NULL');
  await garantirColuna(pool, 'fluxo_caixa', 'motivo_exclusao', 'TEXT NULL');
  await garantirColuna(pool, 'fluxo_caixa', 'encomenda_id', 'INT NULL');
}

async function migrarUnicidadeAtivaProdutos(pool) {
  await garantirColunaGerada(
    pool,
    'categorias',
    'nome_unico_ativo',
    "VARCHAR(60) GENERATED ALWAYS AS (IF(ativo = 1, nome, NULL)) STORED",
  );
  await garantirColunaGerada(
    pool,
    'produtos',
    'nome_unico_ativo',
    "VARCHAR(100) GENERATED ALWAYS AS (IF(ativo = 1, nome, NULL)) STORED",
  );
  await garantirIndiceUnico(pool, 'categorias', 'categorias_nome_unique', ['nome']);
  await garantirIndiceUnico(pool, 'produtos', 'produtos_categoria_nome_unique', ['categoria_id', 'nome']);
  await droparIndiceSeExistir(pool, 'categorias', 'categorias_nome_ativo_unique');
  await droparIndiceSeExistir(pool, 'produtos', 'produtos_categoria_nome_ativo_unique');
}

async function garantirColuna(pool, tabela, coluna, definicao) {
  if (await temColuna(pool, tabela, coluna)) {
    return;
  }
  await alterarAddColumn(pool, tabela, coluna, definicao);
}

async function garantirEnumTipoOcorrencia(pool) {
  const [linhas] = await pool.query("SHOW COLUMNS FROM ocorrencias_folha LIKE 'tipo'");
  const tipo = String(linhas[0]?.Type || '');
  if (tipo.includes('nao_cumprimento')) {
    return;
  }
  await pool.query(
    "ALTER TABLE ocorrencias_folha MODIFY COLUMN tipo ENUM('falta','atestado','hora_extra','nao_cumprimento') NOT NULL",
  );
}

async function garantirColunaGerada(pool, tabela, coluna, definicao) {
  if (await temColuna(pool, tabela, coluna)) {
    return;
  }
  await alterarAddColumn(pool, tabela, coluna, definicao);
}

async function alterarAddColumn(pool, tabela, coluna, definicao) {
  switch (definicao) {
    case 'INT NULL':
      await pool.query('ALTER TABLE ?? ADD COLUMN ?? INT NULL', [tabela, coluna]);
      return;
    case 'TINYINT(1) NOT NULL DEFAULT 1':
      await pool.query('ALTER TABLE ?? ADD COLUMN ?? TINYINT(1) NOT NULL DEFAULT 1', [tabela, coluna]);
      return;
    case 'DATETIME NULL':
      await pool.query('ALTER TABLE ?? ADD COLUMN ?? DATETIME NULL', [tabela, coluna]);
      return;
    case 'TEXT NULL':
      await pool.query('ALTER TABLE ?? ADD COLUMN ?? TEXT NULL', [tabela, coluna]);
      return;
    case "ENUM('mensal','quinzenal') NOT NULL DEFAULT 'mensal'":
      await pool.query(
        "ALTER TABLE ?? ADD COLUMN ?? ENUM('mensal','quinzenal') NOT NULL DEFAULT 'mensal'",
        [tabela, coluna],
      );
      return;
    case 'VARCHAR(40) NULL':
      await pool.query('ALTER TABLE ?? ADD COLUMN ?? VARCHAR(40) NULL', [tabela, coluna]);
      return;
    case 'DECIMAL(10,2) NOT NULL DEFAULT 0':
      await pool.query(
        'ALTER TABLE ?? ADD COLUMN ?? DECIMAL(10,2) NOT NULL DEFAULT 0',
        [tabela, coluna],
      );
      return;
    case 'VARCHAR(60) GENERATED ALWAYS AS (IF(ativo = 1, nome, NULL)) STORED':
      await pool.query(
        'ALTER TABLE ?? ADD COLUMN ?? VARCHAR(60) GENERATED ALWAYS AS (IF(ativo = 1, nome, NULL)) STORED',
        [tabela, coluna],
      );
      return;
    case 'VARCHAR(100) GENERATED ALWAYS AS (IF(ativo = 1, nome, NULL)) STORED':
      await pool.query(
        'ALTER TABLE ?? ADD COLUMN ?? VARCHAR(100) GENERATED ALWAYS AS (IF(ativo = 1, nome, NULL)) STORED',
        [tabela, coluna],
      );
      return;
    default:
      throw new Error('Definição de coluna não permitida nas migrações.');
  }
}

async function garantirIndiceUnico(pool, tabela, indice, colunas) {
  if (await temIndice(pool, tabela, indice)) {
    return;
  }
  await pool.query('ALTER TABLE ?? ADD UNIQUE KEY ?? (??)', [tabela, indice, colunas]);
}

async function droparIndiceSeExistir(pool, tabela, indice) {
  if (!(await temIndice(pool, tabela, indice))) {
    return;
  }
  await pool.query('ALTER TABLE ?? DROP INDEX ??', [tabela, indice]);
}

async function temColuna(pool, tabela, coluna) {
  const [linhas] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [tabela, coluna],
  );
  return Array.isArray(linhas) && linhas.length > 0;
}

async function temIndice(pool, tabela, indice) {
  const [linhas] = await pool.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [tabela, indice],
  );
  return Array.isArray(linhas) && linhas.length > 0;
}

export async function semearConfiguracoes(pool, padroes) {
  for (const { chave, valor } of padroes) {
    await pool.query(
      `INSERT IGNORE INTO configuracoes (chave, valor, atualizado_por) VALUES (?, ?, NULL)`,
      [chave, valor],
    );
  }
}
