import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

describe('GET /api/auditoria', () => {
  test('filtra por entidade e entidade_id depois que o login gerou registro', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      await ctx.usuarioRepository.salvar(
        new Usuario({
          nome: 'Administrador',
          username: 'admin',
          senhaHash: await ctx.hashService.hash('admin123'),
          role: 'admin',
        }),
      );

      const login = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', senha: 'admin123' }),
      });
      const corpoLogin = await json(login);
      assert.equal(login.status, 200);
      const token = corpoLogin.token;
      const usuarioId = corpoLogin.usuario.id;

      await ctx.deps.auditor.registrar({
        usuarioId,
        acao: 'fechar_caixa',
        entidade: 'caixa_turno',
        entidadeId: 12,
        ip: '192.168.0.10',
      });

      const headers = { Authorization: `Bearer ${token}` };

      const semToken = await fetch(`http://127.0.0.1:${porta}/api/auditoria`);
      assert.equal(semToken.status, 401);

      const porLogin = await fetch(
        `http://127.0.0.1:${porta}/api/auditoria?entidade=usuario&entidade_id=${usuarioId}`,
        { headers },
      );
      const corpoLoginAudit = await json(porLogin);
      assert.equal(porLogin.status, 200);
      assert.ok(corpoLoginAudit.data.length >= 1);
      assert.ok(corpoLoginAudit.data.every((item) => item.entidade === 'usuario' && item.entidade_id === usuarioId));
      assert.ok(corpoLoginAudit.data.some((item) => item.acao === 'login'));
      assert.equal(corpoLoginAudit.pagination.page, 1);
      assert.equal('hasNext' in corpoLoginAudit.pagination, true);

      const porTurno = await fetch(
        `http://127.0.0.1:${porta}/api/auditoria?entidade=caixa_turno&entidade_id=12`,
        { headers },
      );
      const corpoTurno = await json(porTurno);
      assert.equal(porTurno.status, 200);
      assert.equal(corpoTurno.pagination.total, 1);
      assert.equal(corpoTurno.data[0].acao, 'fechar_caixa');
      assert.equal(corpoTurno.data[0].entidade, 'caixa_turno');
      assert.equal(corpoTurno.data[0].entidade_id, 12);
      assert.equal(corpoTurno.data[0].usuario_id, usuarioId);
    });
  });
});
