import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GetConfiguracoesPublicas } from '../../src/modules/settings/application/GetConfiguracoesPublicas.js';
import { MemoriaConfiguracaoRepository } from '../helpers/MemoriaConfiguracaoRepository.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

describe('GetConfiguracoesPublicas', () => {
  test('retorna só chaves públicas e nunca fundo_troco_*', async () => {
    const repo = new MemoriaConfiguracaoRepository([
      { chave: 'nome_loja', valor: 'Padaria Teste' },
      { chave: 'slogan', valor: 'Pão quente' },
      { chave: 'logo_url', valor: '/uploads/logo.png' },
      { chave: 'fundo_troco_especie', valor: '40.00' },
      { chave: 'fundo_troco_moedas', valor: '10.00' },
    ]);

    const saida = await new GetConfiguracoesPublicas({ configuracaoRepository: repo }).executar();

    assert.deepEqual(saida, {
      nome_loja: 'Padaria Teste',
      slogan: 'Pão quente',
      logo_url: '/uploads/logo.png',
    });
    assert.equal('fundo_troco_especie' in saida, false);
    assert.equal('fundo_troco_moedas' in saida, false);
  });
});

describe('GET /api/configuracoes/publico', () => {
  test('funciona sem token e omite fundo_troco_*', async () => {
    const { app, configuracaoRepository } = montarAppMemoria();
    await configuracaoRepository.upsert('fundo_troco_especie', '99.00', null);
    await configuracaoRepository.upsert('fundo_troco_moedas', '88.00', null);

    await comServidor(app, async (porta) => {
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/configuracoes/publico`);
      const corpo = await json(resposta);
      const texto = JSON.stringify(corpo);

      assert.equal(resposta.status, 200);
      assert.equal(corpo.nome_loja, 'S&M Panificadora');
      assert.equal(corpo.slogan, 'Pão fresquinho todo dia');
      assert.equal('logo_url' in corpo, true);
      assert.equal('fundo_troco_especie' in corpo, false);
      assert.equal('fundo_troco_moedas' in corpo, false);
      assert.equal(texto.includes('fundo_troco'), false);
      assert.equal(resposta.headers.get('www-authenticate'), null);
    });
  });
});
