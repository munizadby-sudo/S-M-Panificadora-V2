import assert from 'node:assert/strict';
import express from 'express';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { autenticar, apenasAdmin, temPermissao } from '../../src/shared/http/middlewares.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

function respostaFake() {
  return {
    statusCode: 0,
    corpo: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.corpo = payload;
      return this;
    },
  };
}

describe('middlewares de autorização', () => {
  test('autenticar rejeita ausência e token inválido', () => {
    const { tokenService } = montarAppMemoria();
    const mw = autenticar(tokenService);

    const semToken = respostaFake();
    mw({ headers: {} }, semToken, () => {
      throw new Error('não deveria seguir');
    });
    assert.equal(semToken.statusCode, 401);

    const ruim = respostaFake();
    mw({ headers: { authorization: 'Bearer lixo' } }, ruim, () => {
      throw new Error('não deveria seguir');
    });
    assert.equal(ruim.statusCode, 401);
  });

  test('apenasAdmin recusa operador', () => {
    const res = respostaFake();
    apenasAdmin({ usuario: { role: 'operador' } }, res, () => {
      throw new Error('não deveria seguir');
    });
    assert.equal(res.statusCode, 403);
  });

  test('temPermissao: admin passa; operador sem módulo é 403; JSON inválido nega acesso', () => {
    let passou = false;
    temPermissao('estoque')(
      { usuario: { role: 'admin', permissoes: [] } },
      respostaFake(),
      () => {
        passou = true;
      },
    );
    assert.equal(passou, true);

    const semModulo = respostaFake();
    temPermissao('estoque')(
      { usuario: { role: 'operador', permissoes: ['caixa'] } },
      semModulo,
      () => {
        throw new Error('não deveria seguir');
      },
    );
    assert.equal(semModulo.statusCode, 403);

    const jsonRuim = respostaFake();
    temPermissao('caixa')(
      { usuario: { role: 'operador', permissoes: '{nao-json' } },
      jsonRuim,
      () => {
        throw new Error('não deveria seguir');
      },
    );
    assert.equal(jsonRuim.statusCode, 403);
  });
});

describe('rotas protegidas via HTTP', () => {
  test('GET /api/usuarios sem token retorna 401', async () => {
    const { app } = montarAppMemoria();
    await comServidor(app, async (porta) => {
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/usuarios`);
      assert.equal(resposta.status, 401);
    });
  });

  test('operador autenticado não acessa CRUD de usuários', async () => {
    const ctx = montarAppMemoria();
    await ctx.usuarioRepository.salvar(
      new Usuario({
        nome: 'Caixa',
        username: 'caixa',
        senhaHash: await ctx.hashService.hash('123456'),
        role: 'operador',
        permissoes: ['caixa'],
      }),
    );

    await comServidor(ctx.app, async (porta) => {
      const login = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'caixa', senha: '123456' }),
      });
      const { token } = await json(login);
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(resposta.status, 403);
    });
  });

  test('temPermissao bloqueia operador sem o módulo na rota', async () => {
    const ctx = montarAppMemoria();
    await ctx.usuarioRepository.salvar(
      new Usuario({
        nome: 'Caixa',
        username: 'caixa',
        senhaHash: await ctx.hashService.hash('123456'),
        role: 'operador',
        permissoes: ['caixa'],
      }),
    );

    const ping = express();
    ping.get(
      '/api/estoque-ping',
      autenticar(ctx.tokenService),
      temPermissao('estoque'),
      (_req, res) => {
        res.json({ ok: true });
      },
    );

    await comServidor(ctx.app, async (portaLogin) => {
      const login = await fetch(`http://127.0.0.1:${portaLogin}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'caixa', senha: '123456' }),
      });
      const { token } = await json(login);

      await comServidor(ping, async (porta) => {
        const resposta = await fetch(`http://127.0.0.1:${porta}/api/estoque-ping`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(resposta.status, 403);
      });
    });
  });
});
