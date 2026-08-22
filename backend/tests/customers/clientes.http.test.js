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

function headersJson(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

describe('HTTP POST/PUT /api/clientes', () => {
  test('cadastra cliente e rejeita telefone duplicado em ativo com 409', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;

      const criado = await fetch(`${origem}/api/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'Maria Souza', telefone: '83999998888' }),
      });
      const corpo = await json(criado);
      assert.equal(criado.status, 200);
      assert.equal(corpo.nome, 'Maria Souza');
      assert.equal(corpo.telefone, '83999998888');
      assert.equal(corpo.ativo, 1);

      const duplicado = await fetch(`${origem}/api/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'Outra Maria', telefone: '83999998888' }),
      });
      const duplicadoCorpo = await json(duplicado);
      assert.equal(duplicado.status, 409);
      assert.equal(duplicadoCorpo.codigo, 'TELEFONE_JA_CADASTRADO');

      const vazio = await fetch(`${origem}/api/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: '   ', telefone: '83988887777' }),
      });
      assert.equal(vazio.status, 400);

      const atualizado = await fetch(`${origem}/api/clientes/${corpo.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ nome: 'Maria S.', telefone: '83999998888' }),
      });
      const atualizadoCorpo = await json(atualizado);
      assert.equal(atualizado.status, 200);
      assert.equal(atualizadoCorpo.nome, 'Maria S.');

      const outro = await json(
        await fetch(`${origem}/api/clientes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nome: 'João', telefone: '83911112222' }),
        }),
      );
      const conflitoPut = await fetch(`${origem}/api/clientes/${outro.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ nome: 'João', telefone: '83999998888' }),
      });
      assert.equal(conflitoPut.status, 409);
    });
  });
});

describe('HTTP GET /api/clientes', () => {
  test('lista paginada e busca por nome ou telefone parcial', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;

      await fetch(`${origem}/api/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'Maria Souza', telefone: '83999998888' }),
      });
      await fetch(`${origem}/api/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'João Pedro', telefone: '83911112222' }),
      });
      await fetch(`${origem}/api/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'Ana Lima', telefone: '83933334444' }),
      });

      const pagina1 = await json(
        await fetch(`${origem}/api/clientes?page=1&limit=2`, { headers }),
      );
      assert.equal(pagina1.data.length, 2);
      assert.equal(pagina1.pagination.page, 1);
      assert.equal(pagina1.pagination.limit, 2);
      assert.equal(pagina1.pagination.total, 3);
      assert.equal(pagina1.pagination.hasNext, true);

      const pagina2 = await json(
        await fetch(`${origem}/api/clientes?page=2&limit=2`, { headers }),
      );
      assert.equal(pagina2.data.length, 1);
      assert.equal(pagina2.pagination.hasPrevious, true);
      assert.equal(pagina2.pagination.hasNext, false);

      const porNome = await json(
        await fetch(`${origem}/api/clientes?busca=maria`, { headers }),
      );
      assert.equal(porNome.data.length, 1);
      assert.equal(porNome.data[0].nome, 'Maria Souza');

      const porTelefone = await json(
        await fetch(`${origem}/api/clientes?busca=91111`, { headers }),
      );
      assert.equal(porTelefone.data.length, 1);
      assert.equal(porTelefone.data[0].nome, 'João Pedro');

      const ativos = await json(
        await fetch(`${origem}/api/clientes?ativo=1`, { headers }),
      );
      assert.equal(ativos.data.length, 3);
    });
  });
});

describe('HTTP DELETE/POST reativar /api/clientes', () => {
  test('desativa, reativa e recusa reativação quando outro ativo já usa o telefone', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;

      const maria = await json(
        await fetch(`${origem}/api/clientes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nome: 'Maria Souza', telefone: '83999998888' }),
        }),
      );

      const desativado = await fetch(`${origem}/api/clientes/${maria.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(desativado.status, 200);

      const ativos = await json(await fetch(`${origem}/api/clientes?ativo=1`, { headers }));
      assert.equal(ativos.data.length, 0);

      const inativos = await json(await fetch(`${origem}/api/clientes?ativo=0`, { headers }));
      assert.equal(inativos.data.length, 1);
      assert.equal(inativos.data[0].id, maria.id);

      const reativado = await fetch(`${origem}/api/clientes/${maria.id}/reativar`, {
        method: 'POST',
        headers,
      });
      assert.equal(reativado.status, 200);

      const deNovo = await fetch(`${origem}/api/clientes/${maria.id}`, {
        method: 'DELETE',
        headers,
      });
      assert.equal(deNovo.status, 200);

      const joao = await fetch(`${origem}/api/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome: 'João Pedro', telefone: '83999998888' }),
      });
      assert.equal(joao.status, 200);

      const conflito = await fetch(`${origem}/api/clientes/${maria.id}/reativar`, {
        method: 'POST',
        headers,
      });
      const conflitoCorpo = await json(conflito);
      assert.equal(conflito.status, 409);
      assert.equal(conflitoCorpo.codigo, 'TELEFONE_JA_CADASTRADO');

      const aindaInativa = await json(
        await fetch(`${origem}/api/clientes?ativo=0`, { headers }),
      );
      assert.equal(aindaInativa.data.some((item) => item.id === maria.id), true);
    });
  });
});
