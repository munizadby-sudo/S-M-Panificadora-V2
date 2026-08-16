import mysql from 'mysql2/promise';
import { criarPool } from '../../src/infrastructure/database/db.js';

export async function mysqlEstaDisponivel() {
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

export async function garantirDatabaseTeste() {
  const nome = process.env.MYSQL_DATABASE_TEST || 'sm_panificadora_test';
  const admin = criarPool({ database: undefined });
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${nome}\``);
  } finally {
    await admin.end();
  }
}

export function criarPoolTeste() {
  return criarPool({
    database: process.env.MYSQL_DATABASE_TEST || 'sm_panificadora_test',
  });
}
