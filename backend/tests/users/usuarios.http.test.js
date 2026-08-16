import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

async function autenticarComoAdmin(porta, { usuarioRepository, hashService }) {
  await usuarioRepository.salvar(
    new Usuario({
      nome: 'Administrador',
      username: 'admin',
      senhaHash: await hashService.hash('admin123'),
      role: 'admin',
    }),
  );
  const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', senha: 'admin123' }),
  });
  const corpo = await json(resposta);
  return corpo.token;
}

describe('CRUD HTTP /api/usuarios', () => {
  test('admin cria, lista, edita e desativa um operador', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await autenticarComoAdmin(porta, ctx);
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const criado = await fetch(`http://127.0.0.1:${porta}/api/usuarios`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nome: 'Isadora Karem',
          username: 'isa',
          senha: 'segredo',
          role: 'operador',
          permissoes: ['caixa', 'encomendas'],
        }),
      });
      const corpoCriado = await json(criado);
      assert.equal(criado.status, 200);
      assert.equal(corpoCriado.mensagem, 'Usuário criado.');
      assert.ok(corpoCriado.id);

      const lista = await fetch(`http://127.0.0.1:${porta}/api/usuarios?page=1&limit=20`, { headers });
      const corpoLista = await json(lista);
      assert.equal(lista.status, 200);
      assert.equal(corpoLista.pagination.total, 2);
      assert.ok(corpoLista.data.some((item) => item.username === 'isa'));

      const atualizado = await fetch(`http://127.0.0.1:${porta}/api/usuarios/${corpoCriado.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nome: 'Isadora',
          username: 'isa',
          role: 'operador',
          permissoes: ['caixa'],
        }),
      });
      assert.equal(atualizado.status, 200);
      assert.equal((await json(atualizado)).mensagem, 'Usuário atualizado.');

      const desativado = await fetch(`http://127.0.0.1:${porta}/api/usuarios/${corpoCriado.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(desativado.status, 200);
      assert.equal((await json(desativado)).mensagem, 'Usuário desativado.');
    });
  });

  test('admin não desativa a própria conta', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await autenticarComoAdmin(porta, ctx);
      const admin = await ctx.usuarioRepository.buscarPorUsername('admin');
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/usuarios/${admin.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const corpo = await json(resposta);
      assert.equal(resposta.status, 400);
      assert.equal(corpo.erro, 'Você não pode desativar seu próprio usuário.');
    });
  });
});
