import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import mysql from 'mysql2/promise';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { aplicarSchemaUsuarios, criarPool } from '../../src/infrastructure/database/db.js';
import { MySQLUsuarioRepository } from '../../src/modules/users/infrastructure/MySQLUsuarioRepository.js';

const mysqlPronto = await mysqlEstaDisponivel();

describe('MySQLUsuarioRepository', { skip: !mysqlPronto }, () => {
  let pool;
  let repo;

  before(async () => {
    pool = criarPool({
      database: process.env.MYSQL_DATABASE_TEST || 'sm_panificadora_test',
    });
    await garantirDatabaseTeste();
    await aplicarSchemaUsuarios(pool);
    repo = new MySQLUsuarioRepository(pool);
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  test('salva, busca por username/id e lista', async () => {
    const username = `caixa.teste.${Date.now()}.${Math.random().toString(16).slice(2)}`;

    const criado = await repo.salvar(
      new Usuario({
        nome: 'Caixa',
        username,
        senhaHash: 'hash-abc',
        role: 'operador',
        permissoes: ['caixa'],
      }),
    );

    assert.ok(criado.id);
    const porUsername = await repo.buscarPorUsername(username);
    const porId = await repo.buscarPorId(criado.id);
    assert.equal(porUsername.nome, 'Caixa');
    assert.equal(porId.username, username);
    assert.deepEqual(porId.permissoes, ['caixa']);

    const lista = await repo.listar(1, 100);
    assert.ok(lista.data.some((item) => item.id === criado.id));

    await pool.query('DELETE FROM usuarios WHERE id = ?', [criado.id]);
  });
});

async function mysqlEstaDisponivel() {
  try {
    const conexao = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD ?? '',
      connectTimeout: 1500,
    });
    await conexao.query('SELECT 1');
    await conexao.end();
    return true;
  } catch {
    return false;
  }
}

async function garantirDatabaseTeste() {
  const nome = process.env.MYSQL_DATABASE_TEST || 'sm_panificadora_test';
  const admin = criarPool({ database: undefined });
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${nome}\``);
  } finally {
    await admin.end();
  }
}
