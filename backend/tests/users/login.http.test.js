import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { criarLimitadorLogin } from '../../src/app.js';
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

describe('rate limit do login (ISSUE-015)', () => {
  test('5 tentativas erradas bloqueiam a 6ª com 429', async () => {
    const { app, usuarioRepository, hashService } = montarAppMemoria({
      limitadorLogin: criarLimitadorLogin(),
    });
    await usuarioRepository.salvar(
      new Usuario({
        nome: 'Administrador',
        username: 'admin',
        senhaHash: await hashService.hash('admin123'),
        role: 'admin',
      }),
    );

    await comServidor(app, async (porta) => {
      const tentar = (senha) =>
        fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', senha }),
        });

      for (let i = 0; i < 5; i += 1) {
        const resposta = await tentar('errada');
        assert.equal(resposta.status, 401, `tentativa ${i + 1} deveria passar pelo limite`);
      }

      const bloqueada = await tentar('admin123');
      const corpo = await json(bloqueada);
      assert.equal(bloqueada.status, 429, JSON.stringify(corpo));
      assert.equal(corpo.erro, 'Muitas tentativas. Tente novamente em alguns minutos.');
    });
  });

  test('acertar a senha no meio da janela zera o contador', async () => {
    const { app, usuarioRepository, hashService } = montarAppMemoria({
      limitadorLogin: criarLimitadorLogin(),
    });
    await usuarioRepository.salvar(
      new Usuario({
        nome: 'Administrador',
        username: 'admin',
        senhaHash: await hashService.hash('admin123'),
        role: 'admin',
      }),
    );

    await comServidor(app, async (porta) => {
      const tentar = (senha) =>
        fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', senha }),
        });

      for (let i = 0; i < 4; i += 1) {
        const resposta = await tentar('errada');
        assert.equal(resposta.status, 401, `tentativa ${i + 1} deveria passar pelo limite`);
      }

      const acerto = await tentar('admin123');
      assert.equal(acerto.status, 200);

      for (let i = 0; i < 5; i += 1) {
        const resposta = await tentar('errada');
        assert.equal(
          resposta.status,
          401,
          `tentativa ${i + 1} pós-reset ainda deveria passar pelo limite (contador zerado no acerto)`,
        );
      }

      const sextaAposReset = await tentar('errada');
      assert.equal(sextaAposReset.status, 429);
    });
  });
});
