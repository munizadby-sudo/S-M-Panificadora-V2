import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

describe('POST /api/auth/login', () => {
  test('login do seed retorna token e usuario', async () => {
    const { app, usuarioRepository, hashService } = montarAppMemoria();
    await usuarioRepository.salvar(
      new Usuario({
        nome: 'Administrador',
        username: 'admin',
        senhaHash: await hashService.hash('admin123'),
        role: 'admin',
      }),
    );

    await comServidor(app, async (porta) => {
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', senha: 'admin123' }),
      });
      const corpo = await json(resposta);
      assert.equal(resposta.status, 200);
      assert.ok(corpo.token);
      assert.equal(corpo.usuario.username, 'admin');
      assert.equal(corpo.usuario.role, 'admin');
      assert.equal('senhaHash' in corpo.usuario, false);
    });
  });

  test('credencial inválida retorna 401 genérico', async () => {
    const { app } = montarAppMemoria();
    await comServidor(app, async (porta) => {
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', senha: 'errada' }),
      });
      const corpo = await json(resposta);
      assert.equal(resposta.status, 401);
      assert.equal(corpo.erro, 'Usuário ou senha incorretos.');
    });
  });

  test('campos ausentes retornam 400', async () => {
    const { app } = montarAppMemoria();
    await comServidor(app, async (porta) => {
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin' }),
      });
      const corpo = await json(resposta);
      assert.equal(resposta.status, 400);
      assert.equal(corpo.erro, 'Informe usuário e senha.');
    });
  });
});
