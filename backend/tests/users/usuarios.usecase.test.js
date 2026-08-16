import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CreateUser } from '../../src/modules/users/application/CreateUser.js';
import { DeactivateUser } from '../../src/modules/users/application/DeactivateUser.js';
import { UpdateUser } from '../../src/modules/users/application/UpdateUser.js';
import {
  AutoDesativacaoNaoPermitidaError,
  PermissaoInvalidaError,
  UsuarioJaExisteError,
} from '../../src/modules/users/domain/erros.js';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { HashEmMemoria } from '../helpers/app-memoria.js';
import { MemoriaUsuarioRepository } from '../helpers/MemoriaUsuarioRepository.js';

describe('casos de uso de usuários', () => {
  test('CreateUser persiste operador e rejeita permissão inválida e username duplicado', async () => {
    const repo = new MemoriaUsuarioRepository();
    const criar = new CreateUser({ usuarioRepository: repo, hashService: new HashEmMemoria() });

    const criado = await criar.executar({
      nome: 'Isadora Karem',
      username: 'Isa',
      senha: 'segredo',
      role: 'operador',
      permissoes: ['caixa', 'encomendas'],
    });

    assert.equal(criado.username, 'isa');
    assert.equal(criado.senhaHash, 'hash:segredo');
    assert.deepEqual(criado.permissoes, ['caixa', 'encomendas']);

    await assert.rejects(
      () =>
        criar.executar({
          nome: 'Outro',
          username: 'isa',
          senha: 'x',
          role: 'operador',
          permissoes: ['caixa'],
        }),
      UsuarioJaExisteError,
    );

    await assert.rejects(
      () =>
        criar.executar({
          nome: 'Hack',
          username: 'hack',
          senha: 'x',
          role: 'operador',
          permissoes: ['caixa', 'root'],
        }),
      PermissaoInvalidaError,
    );
  });

  test('UpdateUser troca dados e só rehasha senha quando enviada', async () => {
    const repo = new MemoriaUsuarioRepository([
      new Usuario({
        id: 2,
        nome: 'Caixa',
        username: 'caixa',
        senhaHash: 'hash:antiga',
        role: 'operador',
        permissoes: ['caixa'],
      }),
    ]);
    const atualizar = new UpdateUser({ usuarioRepository: repo, hashService: new HashEmMemoria() });

    const semSenha = await atualizar.executar({
      id: 2,
      nome: 'Caixa 2',
      username: 'caixa',
      role: 'operador',
      permissoes: ['caixa', 'estoque'],
    });
    assert.equal(semSenha.nome, 'Caixa 2');
    assert.equal(semSenha.senhaHash, 'hash:antiga');

    const comSenha = await atualizar.executar({
      id: 2,
      nome: 'Caixa 2',
      username: 'caixa',
      senha: 'nova',
      role: 'operador',
      permissoes: ['caixa'],
    });
    assert.equal(comSenha.senhaHash, 'hash:nova');
  });

  test('DeactivateUser recusa auto-desativação e faz soft delete', async () => {
    const alvo = new Usuario({
      id: 4,
      nome: 'Op',
      username: 'op',
      senhaHash: 'hash:x',
      role: 'operador',
      permissoes: ['caixa'],
    });
    const repo = new MemoriaUsuarioRepository([alvo]);
    const desativar = new DeactivateUser({ usuarioRepository: repo });

    await assert.rejects(
      () => desativar.executar({ usuarioAlvoId: 4 }, { id: 4 }),
      AutoDesativacaoNaoPermitidaError,
    );

    const desativado = await desativar.executar({ usuarioAlvoId: 4 }, { id: 1 });
    assert.equal(desativado.ativo, false);
    assert.equal((await repo.buscarPorId(4)).ativo, false);
  });
});
