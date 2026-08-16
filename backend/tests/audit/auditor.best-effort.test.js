import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Auditor } from '../../src/modules/audit/domain/Auditor.js';
import { MySQLAuditoriaRepository } from '../../src/modules/audit/infrastructure/MySQLAuditoriaRepository.js';
import {
  aplicarSchemaAuditoria,
  aplicarSchemaConfiguracoes,
  aplicarSchemaUsuarios,
  semearConfiguracoes,
} from '../../src/infrastructure/database/db.js';
import { padroesParaSeed } from '../../src/modules/settings/domain/chaves.js';
import { criarPoolTeste, garantirDatabaseTeste, mysqlEstaDisponivel } from '../helpers/mysql.js';

describe('Auditor best-effort', () => {
  test('falha no banco é logada e não é propagada', async () => {
    const logs = [];
    const auditor = new Auditor({
      repositorio: {
        async inserir() {
          throw new Error('banco indisponível');
        },
      },
      logger: {
        error(...args) {
          logs.push(args);
        },
      },
    });

    await assert.doesNotReject(() =>
      auditor.registrar({
        usuarioId: 1,
        acao: 'login',
        entidade: 'usuario',
        entidadeId: 1,
      }),
    );

    assert.equal(logs.length, 1);
    assert.equal(logs[0][0], 'Falha ao registrar auditoria');
    assert.equal(logs[0][1].message, 'banco indisponível');
  });

  test('sem repositório, registrar é no-op e não lança', async () => {
    const auditor = new Auditor({});
    await assert.doesNotReject(() => auditor.registrar({ acao: 'login', entidade: 'usuario' }));
  });
});

const mysqlPronto = await mysqlEstaDisponivel();

describe('schema configuracoes e auditoria', { skip: !mysqlPronto }, () => {
  let pool;

  before(async () => {
    await garantirDatabaseTeste();
    pool = criarPoolTeste();
    await aplicarSchemaUsuarios(pool);
    await aplicarSchemaConfiguracoes(pool);
    await aplicarSchemaAuditoria(pool);
    await semearConfiguracoes(pool, padroesParaSeed());
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  test('cria as tabelas, semeia chaves e persiste auditoria', async () => {
    const [chaves] = await pool.query('SELECT chave FROM configuracoes ORDER BY chave');
    assert.deepEqual(
      chaves.map((linha) => linha.chave),
      ['fundo_troco_especie', 'fundo_troco_moedas', 'logo_url', 'nome_loja', 'slogan'],
    );

    await pool.query('DELETE FROM auditoria');
    const auditor = new Auditor({ repositorio: new MySQLAuditoriaRepository(pool) });
    await auditor.registrar({
      usuarioId: null,
      acao: 'login_falhou',
      entidade: 'usuario',
      entidadeId: null,
      estadoDepois: { username: 'ghost' },
      ip: '127.0.0.1',
    });

    const [registros] = await pool.query('SELECT acao, entidade, ip, estado_depois FROM auditoria');
    assert.equal(registros.length, 1);
    assert.equal(registros[0].acao, 'login_falhou');
    assert.equal(registros[0].entidade, 'usuario');
    assert.equal(registros[0].ip, '127.0.0.1');
    const estado = typeof registros[0].estado_depois === 'string'
      ? JSON.parse(registros[0].estado_depois)
      : registros[0].estado_depois;
    assert.equal(estado.username, 'ghost');
  });
});
