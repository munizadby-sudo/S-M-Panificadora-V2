import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { GetConfiguracoes } from '../../src/modules/settings/application/GetConfiguracoes.js';
import { UpdateConfiguracoes } from '../../src/modules/settings/application/UpdateConfiguracoes.js';
import { ChaveConfiguracaoInvalidaError } from '../../src/modules/settings/domain/erros.js';
import { MemoriaConfiguracaoRepository } from '../helpers/MemoriaConfiguracaoRepository.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

async function autenticarComo(porta, { usuarioRepository, hashService }, usuario) {
  await usuarioRepository.salvar(
    new Usuario({
      nome: usuario.nome,
      username: usuario.username,
      senhaHash: await hashService.hash(usuario.senha),
      role: usuario.role,
      permissoes: usuario.permissoes,
    }),
  );
  const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usuario.username, senha: usuario.senha }),
  });
  const corpo = await json(resposta);
  return corpo.token;
}

describe('GetConfiguracoes / UpdateConfiguracoes', () => {
  test('leitura devolve todas as chaves da whitelist, inclusive fundo de troco numérico', async () => {
    const repo = new MemoriaConfiguracaoRepository([
      { chave: 'nome_loja', valor: 'Padaria Teste' },
      { chave: 'slogan', valor: 'Pão quente' },
      { chave: 'logo_url', valor: '/uploads/logo.png' },
      { chave: 'fundo_troco_especie', valor: '40.00' },
      { chave: 'fundo_troco_moedas', valor: '10.00' },
    ]);

    const saida = await new GetConfiguracoes({ configuracaoRepository: repo }).executar();
    assert.equal(saida.nome_loja, 'Padaria Teste');
    assert.equal(saida.fundo_troco_especie, 40);
    assert.equal(saida.fundo_troco_moedas, 10);
  });

  test('chave fora da whitelist lança ChaveConfiguracaoInvalidaError e não grava', async () => {
    const repo = new MemoriaConfiguracaoRepository();
    const atualizar = new UpdateConfiguracoes({ configuracaoRepository: repo, auditor: { registrar: async () => {} } });

    await assert.rejects(
      () => atualizar.executar({ nome_loja: 'X', chave_secreta: 'nao' }, { id: 1 }),
      ChaveConfiguracaoInvalidaError,
    );

    const depois = await repo.listar();
    assert.equal(depois.find((linha) => linha.chave === 'nome_loja').valor, 'S&M Panificadora');
    assert.equal(depois.some((linha) => linha.chave === 'chave_secreta'), false);
  });
});

describe('GET/PUT /api/configuracoes', () => {
  test('autenticado lê e admin escreve; chave estranha retorna 400', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const tokenAdmin = await autenticarComo(porta, ctx, {
        nome: 'Administrador',
        username: 'admin',
        senha: 'admin123',
        role: 'admin',
      });
      const tokenOperador = await autenticarComo(porta, ctx, {
        nome: 'Caixa',
        username: 'caixa',
        senha: 'caixa123',
        role: 'operador',
        permissoes: ['caixa'],
      });

      const semToken = await fetch(`http://127.0.0.1:${porta}/api/configuracoes`);
      assert.equal(semToken.status, 401);

      const leituraOperador = await fetch(`http://127.0.0.1:${porta}/api/configuracoes`, {
        headers: { Authorization: `Bearer ${tokenOperador}` },
      });
      const corpoOperador = await json(leituraOperador);
      assert.equal(leituraOperador.status, 200);
      assert.equal(corpoOperador.nome_loja, 'S&M Panificadora');
      assert.equal(corpoOperador.fundo_troco_especie, 40);
      assert.equal(corpoOperador.fundo_troco_moedas, 10);

      const putOperador = await fetch(`http://127.0.0.1:${porta}/api/configuracoes`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenOperador}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_loja: 'Hack' }),
      });
      assert.equal(putOperador.status, 403);

      const putInvalido = await fetch(`http://127.0.0.1:${porta}/api/configuracoes`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenAdmin}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_loja: 'Ok', chave_secreta: 'nao' }),
      });
      const corpoInvalido = await json(putInvalido);
      assert.equal(putInvalido.status, 400);
      assert.match(corpoInvalido.erro, /inválida/i);

      const putOk = await fetch(`http://127.0.0.1:${porta}/api/configuracoes`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenAdmin}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_loja: 'S&M Panificadora Centro',
          slogan: 'Pão fresquinho todo dia',
          fundo_troco_especie: 50,
          fundo_troco_moedas: 12.5,
        }),
      });
      assert.equal(putOk.status, 200);
      assert.equal((await json(putOk)).mensagem, 'Configurações atualizadas.');

      const leitura = await fetch(`http://127.0.0.1:${porta}/api/configuracoes`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });
      const corpo = await json(leitura);
      assert.equal(corpo.nome_loja, 'S&M Panificadora Centro');
      assert.equal(corpo.fundo_troco_especie, 50);
      assert.equal(corpo.fundo_troco_moedas, 12.5);

      const publico = await json(await fetch(`http://127.0.0.1:${porta}/api/configuracoes/publico`));
      assert.equal(publico.nome_loja, 'S&M Panificadora Centro');
      assert.equal('fundo_troco_especie' in publico, false);
    });
  });
});
