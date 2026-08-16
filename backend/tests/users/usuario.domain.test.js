import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import {
  AutoDesativacaoNaoPermitidaError,
  PermissaoInvalidaError,
  RoleInvalidaError,
} from '../../src/modules/users/domain/erros.js';
import { PERMISSOES_VALIDAS } from '../../src/modules/users/domain/permissoes.js';

describe('domínio Usuario', () => {
  test('admin ignora permissões enviadas e recebe a whitelist completa', () => {
    const admin = new Usuario({
      id: 1,
      nome: 'Administrador',
      username: ' Admin ',
      senhaHash: 'hash',
      role: 'admin',
      permissoes: ['caixa'],
    });

    assert.equal(admin.username, 'admin');
    assert.deepEqual(admin.permissoes, [...PERMISSOES_VALIDAS]);
    assert.equal(admin.possuiPermissao('rel'), true);
    assert.equal(admin.possuiPermissao('modulo-inexistente'), true);
  });

  test('operador com permissão fora da whitelist é rejeitado', () => {
    assert.throws(
      () =>
        new Usuario({
          nome: 'Caixa',
          username: 'caixa',
          senhaHash: 'hash',
          role: 'operador',
          permissoes: ['caixa', 'superuser'],
        }),
      PermissaoInvalidaError,
    );
  });

  test('operador só possui as permissões da lista', () => {
    const operador = new Usuario({
      id: 2,
      nome: 'Caixa',
      username: 'CAIXA',
      senhaHash: 'hash',
      role: 'operador',
      permissoes: ['caixa', 'encomendas'],
    });

    assert.equal(operador.username, 'caixa');
    assert.equal(operador.possuiPermissao('caixa'), true);
    assert.equal(operador.possuiPermissao('estoque'), false);
  });

  test('rejeita auto-desativação', () => {
    const usuario = new Usuario({
      id: 7,
      nome: 'Admin',
      username: 'admin',
      senhaHash: 'hash',
      role: 'admin',
    });

    assert.equal(usuario.podeSerDesativadoPor(7), false);
    assert.throws(() => usuario.desativarPor(7), AutoDesativacaoNaoPermitidaError);
    assert.equal(usuario.ativo, true);
  });

  test('permite desativação por outro usuário', () => {
    const usuario = new Usuario({
      id: 7,
      nome: 'Operador',
      username: 'op',
      senhaHash: 'hash',
      role: 'operador',
      permissoes: ['caixa'],
      ativo: true,
    });

    usuario.desativarPor(1);
    assert.equal(usuario.ativo, false);
  });

  test('role inválida é rejeitada', () => {
    assert.throws(
      () =>
        new Usuario({
          nome: 'X',
          username: 'x',
          senhaHash: 'hash',
          role: 'gerente',
        }),
      RoleInvalidaError,
    );
  });
});
