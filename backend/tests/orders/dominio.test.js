import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Encomenda } from '../../src/modules/orders/domain/Encomenda.js';
import {
  ClienteContatoObrigatorioError,
  EncomendaEntregueBloqueadaError,
  ItensObrigatoriosError,
  SinalInvalidoError,
  StatusEncomendaInvalidoError,
  TransicaoStatusInvalidaError,
} from '../../src/modules/orders/domain/erros.js';

function base(overrides = {}) {
  return {
    clienteNome: 'Maria Souza',
    clienteTelefone: '83999998888',
    dataEntrega: '2026-08-25',
    itens: [{ produtoId: 12, quantidade: 10, precoUnitario: 1.5 }],
    usuarioId: 1,
    ...overrides,
  };
}

describe('domínio Encomenda', () => {
  test('exige pelo menos um item', () => {
    assert.throws(() => new Encomenda(base({ itens: [] })), ItensObrigatoriosError);
  });

  test('total é sempre a soma dos subtotais — nunca aceita total externo', () => {
    assert.throws(() => new Encomenda(base({ total: 999 })), /total é sempre derivado/);

    const encomenda = new Encomenda(
      base({ itens: [{ produtoId: 1, quantidade: 2, precoUnitario: 5 }, { produtoId: 2, quantidade: 1, precoUnitario: 3 }] }),
    );
    assert.equal(encomenda.total, 13);
  });

  test('cliente_nome e cliente_telefone são obrigatórios mesmo sem cliente_id', () => {
    assert.throws(() => new Encomenda(base({ clienteNome: '' })), ClienteContatoObrigatorioError);
    assert.throws(() => new Encomenda(base({ clienteTelefone: '' })), ClienteContatoObrigatorioError);
  });

  test('status deve pertencer à whitelist', () => {
    assert.throws(() => new Encomenda(base({ status: 'enviado' })), StatusEncomendaInvalidoError);
    const encomenda = new Encomenda(base({ status: 'pronto' }));
    assert.equal(encomenda.status, 'pronto');
  });

  test('sinal nunca pode ser negativo', () => {
    assert.throws(() => new Encomenda(base({ sinal: -1 })), SinalInvalidoError);
  });

  test('cliente_id é opcional', () => {
    const semCliente = new Encomenda(base());
    assert.equal(semCliente.clienteId, null);

    const comCliente = new Encomenda(base({ clienteId: 7 }));
    assert.equal(comCliente.clienteId, 7);
  });

  test('cancelar marca ativo = false sem remover o registro', () => {
    const encomenda = Encomenda.reconstituir({
      id: 3,
      numero: 45,
      clienteId: null,
      clienteNome: 'Maria Souza',
      clienteTelefone: '83999998888',
      dataEntrega: '2026-08-25',
      sinal: 0,
      itens: [{ produtoId: 1, quantidade: 1, precoUnitario: 1, subtotal: 1 }],
      total: 1,
      status: 'pendente',
      usuarioId: 1,
    });
    assert.equal(encomenda.ativo, true);
    encomenda.cancelar();
    assert.equal(encomenda.ativo, false);
    assert.equal(encomenda.id, 3);
  });

  test('mudarStatus só avança pendente → pronto; entregue exige finalizar', () => {
    const encomenda = new Encomenda(base());
    encomenda.mudarStatus('pronto');
    assert.equal(encomenda.status, 'pronto');
    assert.throws(() => encomenda.mudarStatus('entregue'), TransicaoStatusInvalidaError);
    assert.throws(() => encomenda.mudarStatus('cancelado'), StatusEncomendaInvalidoError);
  });

  test('operador não volta status; admin reabre entregue para pronto', () => {
    const encomenda = new Encomenda(base({ status: 'pronto' }));
    assert.throws(() => encomenda.mudarStatus('pendente'), TransicaoStatusInvalidaError);
    encomenda.mudarStatus('pendente', { role: 'admin' });
    assert.equal(encomenda.status, 'pendente');

    const entregue = new Encomenda(base({ status: 'pronto' }));
    entregue.finalizarEntrega();
    assert.equal(entregue.status, 'entregue');
    assert.throws(() => entregue.mudarStatus('pronto'), EncomendaEntregueBloqueadaError);
    entregue.mudarStatus('pronto', { role: 'admin' });
    assert.equal(entregue.status, 'pronto');
  });

  test('saldo a receber nunca fica negativo e entregue trava edição/cancelamento', () => {
    const encomenda = new Encomenda(base({ sinal: 20 }));
    assert.equal(encomenda.total, 15);
    assert.equal(encomenda.saldoAReceber(), 0);
    encomenda.mudarStatus('pronto');
    encomenda.finalizarEntrega();
    assert.equal(encomenda.saldoAReceber(), 0);
    assert.throws(() => encomenda.garantirEditavel(), EncomendaEntregueBloqueadaError);
    assert.throws(() => encomenda.cancelar(), EncomendaEntregueBloqueadaError);
  });
});
