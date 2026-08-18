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

describe('HTTP /api/produtos', () => {
  test('cria produto vinculado à categoria e rejeita duplicata na mesma categoria', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const categoria = await json(
        await fetch(`http://127.0.0.1:${porta}/api/categorias`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nome: 'Pães' }),
        }),
      );
      const outra = await json(
        await fetch(`http://127.0.0.1:${porta}/api/categorias`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nome: 'Doces' }),
        }),
      );

      const criado = await fetch(`http://127.0.0.1:${porta}/api/produtos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nome: 'Pão Francês',
          categoria_id: categoria.id,
          icone: '🥖',
          preco: 0.75,
          custo: 0.3,
        }),
      });
      const corpo = await json(criado);
      assert.equal(criado.status, 200);
      assert.equal(corpo.nome, 'Pão Francês');
      assert.equal(corpo.categoria_id, categoria.id);
      assert.equal(corpo.preco, 0.75);

      const duplicado = await fetch(`http://127.0.0.1:${porta}/api/produtos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nome: 'Pão Francês',
          categoria_id: categoria.id,
          preco: 1,
          custo: 0,
        }),
      });
      assert.equal(duplicado.status, 409);

      const mesmoNomeOutraCategoria = await fetch(`http://127.0.0.1:${porta}/api/produtos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nome: 'Pão Francês',
          categoria_id: outra.id,
          preco: 1,
          custo: 0,
        }),
      });
      assert.equal(mesmoNomeOutraCategoria.status, 200);

      const lista = await json(
        await fetch(`http://127.0.0.1:${porta}/api/produtos?categoria_id=${categoria.id}&busca=Franc`, {
          headers,
        }),
      );
      assert.equal(lista.data.length, 1);
      assert.equal(lista.pagination.total, 1);

      const atualizado = await json(
        await fetch(`http://127.0.0.1:${porta}/api/produtos/${corpo.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            nome: 'Pão Francês',
            categoria_id: categoria.id,
            preco: 0.8,
            custo: 0.3,
          }),
        }),
      );
      assert.equal(atualizado.preco, 0.8);

      const desativado = await fetch(`http://127.0.0.1:${porta}/api/produtos/${corpo.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(desativado.status, 200);

      const ativos = await json(
        await fetch(`http://127.0.0.1:${porta}/api/produtos?ativo=1&categoria_id=${categoria.id}`, {
          headers,
        }),
      );
      assert.equal(ativos.data.length, 0);

      const inativos = await json(
        await fetch(`http://127.0.0.1:${porta}/api/produtos?ativo=0&categoria_id=${categoria.id}`, {
          headers,
        }),
      );
      assert.equal(inativos.data.length, 1);
      assert.equal(inativos.data[0].id, corpo.id);
      assert.equal(inativos.data[0].ativo, 0);

      const reativado = await fetch(`http://127.0.0.1:${porta}/api/produtos/${corpo.id}/reativar`, {
        method: 'POST',
        headers,
      });
      assert.equal(reativado.status, 200);
      assert.equal((await json(reativado)).mensagem, 'Produto reativado.');

      const deNovoAtivos = await json(
        await fetch(`http://127.0.0.1:${porta}/api/produtos?ativo=1&categoria_id=${categoria.id}`, {
          headers,
        }),
      );
      assert.equal(deNovoAtivos.data.length, 1);
      assert.equal(deNovoAtivos.data[0].id, corpo.id);
    });
  });

  test('criar produto com o mesmo nome de um inativo na mesma categoria retorna 409', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const categoria = await json(
        await fetch(`http://127.0.0.1:${porta}/api/categorias`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nome: 'Pães' }),
        }),
      );

      const primeiro = await json(
        await fetch(`http://127.0.0.1:${porta}/api/produtos`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nome: 'Pão Francês', categoria_id: categoria.id, preco: 0.75, custo: 0.3 }),
        }),
      );
      assert.equal(
        (
          await fetch(`http://127.0.0.1:${porta}/api/produtos/${primeiro.id}`, {
            method: 'DELETE',
            headers,
          })
        ).status,
        200,
      );

      const segundo = await fetch(`http://127.0.0.1:${porta}/api/produtos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'Pão Francês', categoria_id: categoria.id, preco: 0.8, custo: 0.3 }),
      });
      assert.equal(segundo.status, 409);

      const inativos = await json(
        await fetch(`http://127.0.0.1:${porta}/api/produtos?ativo=0&categoria_id=${categoria.id}`, { headers }),
      );
      assert.equal(inativos.data.length, 1);
      assert.equal(inativos.data[0].id, primeiro.id);
    });
  });
});
