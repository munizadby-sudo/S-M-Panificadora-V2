import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { estornarPerda } from '../../src/modules/perdas/api.js';
import { htmlTabelaPerdas } from '../../src/modules/perdas/lista.js';
import { htmlModalEstorno } from '../../src/modules/perdas/modal-estorno.js';

const itemPerda = {
  id: 8,
  produto: 'Pão Francês',
  data: '2026-08-17',
  quantidade: 5,
  motivo: 'queimado',
  custo_calculado: 1.5,
  usuario: 'Admin',
  ativo: 1,
};

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
});

function jsonOk(corpo) {
  return {
    status: 200,
    ok: true,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 4 — estorno somente admin', () => {
  test('botão Estornar só aparece para admin', () => {
    salvarSessao('token', {
      id: 1,
      nome: 'Operador',
      username: 'op',
      role: 'operador',
      permissoes: ['perdas'],
    });

    const htmlOperador = htmlTabelaPerdas([itemPerda], { ehAdmin: false });
    assert.doesNotMatch(htmlOperador, /Estornar/);
    assert.doesNotMatch(htmlOperador, /data-estornar-perda/);

    const htmlAdmin = htmlTabelaPerdas([itemPerda], { ehAdmin: true });
    assert.match(htmlAdmin, /data-estornar-perda="8"/);
    assert.match(htmlAdmin, />Estornar</);
  });

  test('modal de estorno exige confirmação explícita', () => {
    const html = htmlModalEstorno({ perda: itemPerda });
    assert.match(html, /Tem certeza\? Isso reverte o estoque desta perda\./);
    assert.match(html, /btn-confirmar-estorno/);
    assert.match(html, /btn-cancelar-estorno/);
    assert.match(html, /Pão Francês/);
  });

  test('perda estornada aparece marcada na listagem de estornadas', () => {
    const html = htmlTabelaPerdas([{ ...itemPerda, ativo: 0 }], { ehAdmin: true });
    assert.match(html, /perdas-linha-estornada/);
    assert.match(html, /Estornada/);
    assert.doesNotMatch(html, /data-estornar-perda/);
  });

  test('estornarPerda envia DELETE /perdas/:id', async () => {
    salvarSessao('token', {
      id: 1,
      nome: 'Admin',
      username: 'admin',
      role: 'admin',
      permissoes: ['perdas'],
    });

    const urls = [];
    globalThis.fetch = async (url, init) => {
      urls.push(`${init.method} ${url}`);
      return jsonOk({ mensagem: 'Perda estornada. Estoque revertido.' });
    };

    await estornarPerda(8);
    assert.deepEqual(urls, ['DELETE http://127.0.0.1:4173/api/perdas/8']);
  });
});
