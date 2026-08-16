import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { PERMISSOES_VALIDAS } from '../../src/modules/users/domain/permissoes.js';
import { BcryptHashService } from '../../src/modules/users/infrastructure/BcryptHashService.js';
import { JwtTokenService } from '../../src/modules/users/infrastructure/JwtTokenService.js';

describe('BcryptHashService', () => {
  test('hash e conferência batem; senha errada não bate', async () => {
    const hashService = new BcryptHashService();
    const senhaHash = await hashService.hash('segredo');
    assert.equal(senhaHash.startsWith('$2'), true);
    assert.equal(await hashService.conferir('segredo', senhaHash), true);
    assert.equal(await hashService.conferir('outra', senhaHash), false);
  });
});

describe('JwtTokenService', () => {
  test('emite payload compatível com o frontend e verifica o token', () => {
    const tokens = new JwtTokenService({ secret: 'teste-secret', expiresIn: '12h' });
    const usuario = new Usuario({
      id: 1,
      nome: 'Administrador',
      username: 'admin',
      senhaHash: 'hash',
      role: 'admin',
    });

    const token = tokens.emitir(usuario);
    const payload = tokens.verificar(token);

    assert.equal(payload.id, 1);
    assert.equal(payload.nome, 'Administrador');
    assert.equal(payload.username, 'admin');
    assert.equal(payload.role, 'admin');
    assert.deepEqual(payload.permissoes, [...PERMISSOES_VALIDAS]);
    assert.equal('senhaHash' in payload, false);
  });

  test('token adulterado é rejeitado', () => {
    const tokens = new JwtTokenService({ secret: 'teste-secret' });
    assert.throws(() => tokens.verificar('token.invalido'));
  });
});
