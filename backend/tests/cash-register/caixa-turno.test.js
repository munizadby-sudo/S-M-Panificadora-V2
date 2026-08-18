import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calcularFechamento } from '../../src/modules/cash-register/domain/FechamentoCaixa.js';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

describe('FechamentoCaixa', () => {
  test('classifica bateu certo, sobra e falta a partir dos totais', () => {
    const certo = calcularFechamento({
      fundoEspecie: 40,
      fundoMoedas: 10,
      totaisPorForma: [{ forma: 'dinheiro', total: 100 }, { forma: 'pix', total: 50 }],
      contado: { dinheiro: 140, moedas: 10, pix: 50, cartao: 0 },
    });
    assert.equal(certo.esperado.dinheiro, 150);
    assert.equal(certo.contado.dinheiro, 150);
    assert.equal(certo.diferenca.total, 0);
    assert.equal(certo.statusResumo, 'bateu certo');

    const sobra = calcularFechamento({
      fundoEspecie: 40,
      fundoMoedas: 10,
      contado: { dinheiro: 50, moedas: 5, pix: 0, cartao: 0 },
    });
    assert.equal(sobra.statusResumo, 'sobra');
    assert.equal(sobra.diferenca.total, 5);

    const falta = calcularFechamento({
      fundoEspecie: 40,
      fundoMoedas: 10,
      contado: { dinheiro: 30, moedas: 0, pix: 0, cartao: 0 },
    });
    assert.equal(falta.statusResumo, 'falta');
  });
});

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

describe('HTTP /api/caixa-turno', () => {
  test('status fechado, abrir, preview e fechar com sem_impressao', async () => {
    const ctx = montarAppMemoria();
    ctx.correcaoPendenteRepository.pendentes.push({
      id: 3,
      venda_id: 481,
      motivo: 'Item lançado em dobro',
      solicitado_por: 'Isadora Karem',
      criado_em: '2026-08-11T12:10:00-03:00',
    });

    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const statusFechado = await json(await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/status`, { headers }));
      assert.equal(statusFechado.aberto, false);
      assert.equal(statusFechado.turno, null);

      const aberto = await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/abrir`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fundo_especie: 40, fundo_moedas: 10 }),
      });
      const corpoAberto = await json(aberto);
      assert.equal(aberto.status, 200);
      assert.equal(corpoAberto.status, 'aberto');
      assert.equal(corpoAberto.correcoes_pendentes.length, 1);

      const statusAberto = await json(await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/status`, { headers }));
      assert.equal(statusAberto.aberto, true);
      assert.equal(statusAberto.turno.fundo_especie, 40);
      assert.equal(statusAberto.turno.esperado.dinheiro, 50);

      const preview = await json(await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/preview-fechamento`, { headers }));
      assert.equal(preview.esperado.dinheiro, 50);

      const payloadFechar = {
        turno_id: corpoAberto.id,
        contado_dinheiro: 40,
        contado_moedas: 10,
        contado_pix: 0,
        contado_cartao: 0,
        observacao: '',
        sem_impressao: true,
      };

      const fechado = await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/fechar`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadFechar),
      });
      const corpoFechado = await json(fechado);
      assert.equal(fechado.status, 200);
      assert.equal(corpoFechado.status_resumo, 'bateu certo');
      assert.equal(corpoFechado.diferenca.total, 0);
      assert.equal(corpoFechado.idempotente, false);

      const fechadoDeNovo = await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/fechar`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadFechar),
      });
      const corpoFechadoDeNovo = await json(fechadoDeNovo);
      assert.equal(fechadoDeNovo.status, 200);
      assert.equal(corpoFechadoDeNovo.idempotente, true);
      assert.equal(corpoFechadoDeNovo.status_resumo, 'bateu certo');
      assert.equal(corpoFechadoDeNovo.diferenca.total, 0);
      assert.deepEqual(corpoFechadoDeNovo.esperado, corpoFechado.esperado);
      assert.deepEqual(corpoFechadoDeNovo.contado, corpoFechado.contado);

      const inexistente = await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/fechar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payloadFechar, turno_id: 9999 }),
      });
      assert.equal(inexistente.status, 404);

      const statusDepois = await json(await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/status`, { headers }));
      assert.equal(statusDepois.aberto, false);
    });
  });

  test('fechar o mesmo turno_id duas vezes retorna 200 e idempotente true na segunda', async () => {
    const ctx = montarAppMemoria();

    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const aberto = await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/abrir`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fundo_especie: 40, fundo_moedas: 10 }),
      });
      const corpoAberto = await json(aberto);
      assert.equal(aberto.status, 200);

      const payloadFechar = {
        turno_id: corpoAberto.id,
        contado_dinheiro: 40,
        contado_moedas: 10,
        contado_pix: 0,
        contado_cartao: 0,
        observacao: 'retry',
        sem_impressao: true,
      };

      const primeiro = await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/fechar`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadFechar),
      });
      const corpoPrimeiro = await json(primeiro);
      assert.equal(primeiro.status, 200);
      assert.equal(corpoPrimeiro.idempotente, false);
      assert.equal(corpoPrimeiro.id, corpoAberto.id);

      const segundo = await fetch(`http://127.0.0.1:${porta}/api/caixa-turno/fechar`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadFechar),
      });
      const corpoSegundo = await json(segundo);
      assert.equal(segundo.status, 200);
      assert.equal(corpoSegundo.idempotente, true);
      assert.equal(corpoSegundo.id, corpoPrimeiro.id);
      assert.equal(corpoSegundo.status_resumo, corpoPrimeiro.status_resumo);
      assert.deepEqual(corpoSegundo.esperado, corpoPrimeiro.esperado);
      assert.deepEqual(corpoSegundo.contado, corpoPrimeiro.contado);
      assert.deepEqual(corpoSegundo.diferenca, corpoPrimeiro.diferenca);
    });
  });
});
