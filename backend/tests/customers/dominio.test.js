import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { aplicarSchemaClientes } from '../../src/infrastructure/database/db.js';
import { Cliente } from '../../src/modules/customers/domain/Cliente.js';
import {
  NomeInvalidoError,
  TelefoneInvalidoError,
} from '../../src/modules/customers/domain/erros.js';

describe('domínio Cliente', () => {
  test('rejeita nome vazio ou só espaços', () => {
    assert.throws(
      () => new Cliente({ nome: '   ', telefone: '83999998888' }),
      NomeInvalidoError,
    );
    assert.throws(
      () => new Cliente({ nome: '', telefone: '83999998888' }),
      NomeInvalidoError,
    );
  });

  test('rejeita telefone vazio, curto ou sem dígitos suficientes', () => {
    assert.throws(
      () => new Cliente({ nome: 'Maria', telefone: '   ' }),
      TelefoneInvalidoError,
    );
    assert.throws(
      () => new Cliente({ nome: 'Maria', telefone: '123' }),
      TelefoneInvalidoError,
    );
    assert.throws(
      () => new Cliente({ nome: 'Maria', telefone: 'abcdefgh' }),
      TelefoneInvalidoError,
    );
  });

  test('normaliza nome, aceita telefone digitado livremente e permite desativar/reativar', () => {
    const cliente = new Cliente({
      id: 7,
      nome: '  Maria Souza  ',
      telefone: '83999998888',
    });
    assert.equal(cliente.nome, 'Maria Souza');
    assert.equal(cliente.telefone, '83999998888');
    assert.equal(cliente.ativo, true);
    assert.deepEqual(cliente.paraPublico(), {
      id: 7,
      nome: 'Maria Souza',
      telefone: '83999998888',
      ativo: 1,
      criado_em: null,
    });

    cliente.desativar();
    assert.equal(cliente.ativo, false);
    cliente.reativar();
    assert.equal(cliente.ativo, true);
  });
});

describe('schema clientes', () => {
  test('aplicarSchemaClientes cria unicidade de telefone entre ativos', async () => {
    const ddl = [];
    const pool = {
      async query(sql) {
        ddl.push(String(sql));
        return [[], []];
      },
    };
    await aplicarSchemaClientes(pool);
    assert.ok(ddl.some((sql) => /CREATE TABLE IF NOT EXISTS clientes/i.test(sql)));
    assert.ok(ddl.some((sql) => /telefone_unico_ativo/i.test(sql)));
    assert.ok(ddl.some((sql) => /clientes_telefone_ativo_unique/i.test(sql)));
  });
});
