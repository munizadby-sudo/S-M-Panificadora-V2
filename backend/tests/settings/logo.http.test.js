import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { UploadLogo, TAMANHO_MAXIMO_LOGO_BYTES } from '../../src/modules/settings/application/UploadLogo.js';
import { ArquivoLogoInvalidoError } from '../../src/modules/settings/domain/erros.js';
import { DiscoLogoStorage } from '../../src/modules/settings/infrastructure/DiscoLogoStorage.js';
import { MemoriaConfiguracaoRepository } from '../helpers/MemoriaConfiguracaoRepository.js';
import { MemoriaLogoStorage, comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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

describe('UploadLogo', () => {
  test('arquivo grande ou tipo inválido é rejeitado antes de gravar', async () => {
    const repo = new MemoriaConfiguracaoRepository();
    const storage = new MemoriaLogoStorage();
    const caso = new UploadLogo({ configuracaoRepository: repo, logoStorage: storage, auditor: { registrar: async () => {} } });

    await assert.rejects(
      () =>
        caso.executar(
          { buffer: Buffer.alloc(TAMANHO_MAXIMO_LOGO_BYTES + 1), size: TAMANHO_MAXIMO_LOGO_BYTES + 1, mimetype: 'image/png' },
          { id: 1 },
        ),
      ArquivoLogoInvalidoError,
    );
    await assert.rejects(
      () => caso.executar({ buffer: Buffer.from('x'), size: 1, mimetype: 'text/plain' }, { id: 1 }),
      ArquivoLogoInvalidoError,
    );
    assert.equal(storage.salvos.length, 0);
    assert.equal((await repo.listar()).find((linha) => linha.chave === 'logo_url').valor, '');
  });
});

describe('POST /api/configuracoes/logo', () => {
  test('admin envia PNG e arquivo grande demais é rejeitado sem gravar', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const formOk = new FormData();
      formOk.append('logo', new Blob([PNG_1x1], { type: 'image/png' }), 'marca.png');

      const ok = await fetch(`http://127.0.0.1:${porta}/api/configuracoes/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formOk,
      });
      const corpoOk = await json(ok);
      assert.equal(ok.status, 200);
      assert.equal(corpoOk.logo_url, '/uploads/logo.png');
      assert.equal(ctx.logoStorage.salvos.length, 1);

      const formGrande = new FormData();
      formGrande.append(
        'logo',
        new Blob([Buffer.alloc(TAMANHO_MAXIMO_LOGO_BYTES + 1)], { type: 'image/png' }),
        'grande.png',
      );
      const grande = await fetch(`http://127.0.0.1:${porta}/api/configuracoes/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formGrande,
      });
      const corpoGrande = await json(grande);
      assert.equal(grande.status, 400);
      assert.match(corpoGrande.erro, /3MB/i);
      assert.equal(ctx.logoStorage.salvos.length, 1);
    });
  });

  test('grava de verdade no disco via DiscoLogoStorage', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'sm-logo-'));
    try {
      const storage = new DiscoLogoStorage(pasta);
      const url = await storage.salvar({ buffer: PNG_1x1, mimetype: 'image/png', originalname: 'a.png' });
      assert.equal(url, '/uploads/logo.png');
      const gravado = await readFile(join(pasta, 'logo.png'));
      assert.deepEqual(gravado, PNG_1x1);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });
});
