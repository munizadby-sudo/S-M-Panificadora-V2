import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Login } from '../../src/modules/users/application/Login.js';
import { CredenciaisInvalidasError } from '../../src/modules/users/domain/erros.js';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { JwtTokenService } from '../../src/modules/users/infrastructure/JwtTokenService.js';
import { Auditor } from '../../src/modules/audit/domain/Auditor.js';
import { NoOpAuditoriaService } from '../../src/modules/users/infrastructure/NoOpAuditoriaService.js';
import { HashEmMemoria } from '../helpers/app-memoria.js';
import { MemoriaUsuarioRepository } from '../helpers/MemoriaUsuarioRepository.js';

function montarLogin(usuarios, auditoriaService = new NoOpAuditoriaService()) {
  return new Login({
    usuarioRepository: new MemoriaUsuarioRepository(usuarios),
    hashService: new HashEmMemoria(),
    tokenService: new JwtTokenService({ secret: 'teste-secret' }),
    auditoriaService,
  });
}

describe('caso de uso Login', () => {
  test('usuário ativo com senha correta recebe token e dados públicos', async () => {
    const login = montarLogin([
      new Usuario({
        id: 1,
        nome: 'Administrador',
        username: 'admin',
        senhaHash: 'hash:admin123',
        role: 'admin',
      }),
    ]);

    const resultado = await login.executar({ username: ' Admin ', senha: 'admin123' });
    assert.ok(resultado.token);
    assert.equal(resultado.usuario.username, 'admin');
    assert.equal(resultado.usuario.role, 'admin');
  });

  test('usuário inexistente, senha errada e inativo usam a mesma mensagem', async () => {
    const login = montarLogin([
      new Usuario({
        id: 1,
        nome: 'Admin',
        username: 'admin',
        senhaHash: 'hash:certa',
        role: 'admin',
      }),
      new Usuario({
        id: 2,
        nome: 'Inativo',
        username: 'inativo',
        senhaHash: 'hash:x',
        role: 'operador',
        permissoes: ['caixa'],
        ativo: false,
      }),
    ]);

    const casos = [
      { username: 'naoexiste', senha: 'x' },
      { username: 'admin', senha: 'errada' },
      { username: 'inativo', senha: 'x' },
    ];

    for (const entrada of casos) {
      await assert.rejects(() => login.executar(entrada), (erro) => {
        assert.ok(erro instanceof CredenciaisInvalidasError);
        assert.equal(erro.message, 'Usuário ou senha incorretos.');
        assert.equal(erro.status, 401);
        return true;
      });
    }
  });

  test('falha ao gravar auditoria não impede o login', async () => {
    const auditor = new Auditor({
      repositorio: {
        async inserir() {
          throw new Error('banco indisponível');
        },
      },
      logger: { error() {} },
    });
    const login = montarLogin(
      [
        new Usuario({
          id: 1,
          nome: 'Administrador',
          username: 'admin',
          senhaHash: 'hash:admin123',
          role: 'admin',
        }),
      ],
      auditor,
    );

    const resultado = await login.executar({ username: 'admin', senha: 'admin123' });
    assert.ok(resultado.token);
    assert.equal(resultado.usuario.username, 'admin');
  });
});
