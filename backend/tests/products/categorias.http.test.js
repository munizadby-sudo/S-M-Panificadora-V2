import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

async function tokenAdmin(porta, ctx) {
  await ctx.usuarioRepository.salvar(
    new Usuario({
      nome: 'Administrador',
      username: 'admin',
      senhaHash: await ctx.hashService.hash('admin123'),
      role: 'admin',
    }),
  );
  const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', senha: 'admin123' }),
  });
  return (await json(resposta)).token;
}

describe('HTTP /api/categorias', () => {
  test('cria, lista e desativa categoria', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const criada = await fetch(`http://127.0.0.1:${porta}/api/categorias`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'Pães' }),
      });
      const corpoCriada = await json(criada);
      assert.equal(criada.status, 200);
      assert.equal(corpoCriada.nome, 'Pães');
      assert.equal(corpoCriada.ativo, 1);

      const duplicada = await fetch(`http://127.0.0.1:${porta}/api/categorias`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'Pães' }),
      });
      assert.equal(duplicada.status, 409);

      const lista = await json(await fetch(`http://127.0.0.1:${porta}/api/categorias`, { headers }));
      assert.equal(lista.data.length, 1);

      const desativada = await fetch(`http://127.0.0.1:${porta}/api/categorias/${corpoCriada.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(desativada.status, 200);

      const depois = await json(
        await fetch(`http://127.0.0.1:${porta}/api/categorias?ativo=1`, { headers }),
      );
      assert.equal(depois.data.length, 0);

      const inativas = await json(
        await fetch(`http://127.0.0.1:${porta}/api/categorias?ativo=0`, { headers }),
      );
      assert.equal(inativas.data.length, 1);
      assert.equal(inativas.data[0].id, corpoCriada.id);

      const reativada = await fetch(`http://127.0.0.1:${porta}/api/categorias/${corpoCriada.id}/reativar`, {
        method: 'POST',
        headers,
      });
      assert.equal(reativada.status, 200);
      assert.equal((await json(reativada)).mensagem, 'Categoria reativada.');

      const ativasDeNovo = await json(
        await fetch(`http://127.0.0.1:${porta}/api/categorias?ativo=1`, { headers }),
      );
      assert.equal(ativasDeNovo.data.length, 1);
    });
  });

  test('criar categoria com o mesmo nome de uma inativa retorna 409', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const primeira = await json(
        await fetch(`http://127.0.0.1:${porta}/api/categorias`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nome: 'Pães' }),
        }),
      );
      assert.equal(
        (
          await fetch(`http://127.0.0.1:${porta}/api/categorias/${primeira.id}`, {
            method: 'DELETE',
            headers,
          })
        ).status,
        200,
      );

      const segunda = await fetch(`http://127.0.0.1:${porta}/api/categorias`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'Pães' }),
      });
      assert.equal(segunda.status, 409);
    });
  });
});
