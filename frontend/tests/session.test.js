import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from './helpers/ambiente.js';
import {
  estaAutenticado,
  getToken,
  getUsuario,
  limparSessao,
  salvarSessao,
  temPermissao,
} from '../src/core/session.js';

const usuarioOperador = {
  id: 2,
  nome: 'Caixa',
  username: 'caixa',
  role: 'operador',
  permissoes: ['caixa', 'encomendas'],
};

const usuarioAdmin = {
  id: 1,
  nome: 'Administrador',
  username: 'admin',
  role: 'admin',
  permissoes: [],
};

beforeEach(() => {
  instalarAmbienteDeTeste();
});

describe('session', () => {
  test('sem token, estaAutenticado é false', () => {
    assert.equal(estaAutenticado(), false);
    assert.equal(getToken(), null);
    assert.equal(getUsuario(), null);
  });

  test('salvarSessao persiste token e usuário', () => {
    salvarSessao('token-abc', usuarioOperador);
    assert.equal(estaAutenticado(), true);
    assert.equal(getToken(), 'token-abc');
    assert.deepEqual(getUsuario(), usuarioOperador);
  });

  test('limparSessao remove token e usuário', () => {
    salvarSessao('token-abc', usuarioOperador);
    limparSessao();
    assert.equal(estaAutenticado(), false);
    assert.equal(getToken(), null);
    assert.equal(getUsuario(), null);
  });

  test('admin tem qualquer permissão', () => {
    salvarSessao('token-admin', usuarioAdmin);
    assert.equal(temPermissao('caixa'), true);
    assert.equal(temPermissao('rel'), true);
    assert.equal(temPermissao('modulo-inexistente'), true);
  });

  test('operador só tem as permissões da lista', () => {
    salvarSessao('token-op', usuarioOperador);
    assert.equal(temPermissao('caixa'), true);
    assert.equal(temPermissao('encomendas'), true);
    assert.equal(temPermissao('estoque'), false);
    assert.equal(temPermissao('rel'), false);
  });

  test('sem usuário, temPermissao é false', () => {
    assert.equal(temPermissao('caixa'), false);
  });
});
