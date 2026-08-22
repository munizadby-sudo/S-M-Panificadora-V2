import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { criarEncomenda, mensagemErroEncomenda, mudarStatusEncomenda } from '../../src/modules/encomendas/api.js';
import { validarFormularioEncomenda } from '../../src/modules/encomendas/validacao.js';
import { adicionarItem, removerItem, totalLocalItens } from '../../src/modules/encomendas/itens.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['encomendas'],
  });
});

function jsonOk(corpo, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 2 — cadastro (cliente opcional) e itens estilo carrinho', () => {
  test('validarFormularioEncomenda exige nome, telefone, data válida e ao menos um item', () => {
    const invalido = validarFormularioEncomenda({
      clienteNome: '',
      clienteTelefone: '',
      dataEntrega: 'data-invalida',
      sinal: -5,
      itens: [],
    });
    assert.equal(invalido.ok, false);
    assert.ok(invalido.erros.clienteNome);
    assert.ok(invalido.erros.clienteTelefone);
    assert.ok(invalido.erros.dataEntrega);
    assert.ok(invalido.erros.sinal);
    assert.ok(invalido.erros.itens);
  });

  test('validarFormularioEncomenda aceita entrada válida e normaliza itens', () => {
    const valido = validarFormularioEncomenda({
      clienteNome: 'Maria Souza',
      clienteTelefone: '83999998888',
      dataEntrega: '2026-08-25',
      sinal: '10',
      itens: [{ produtoId: 12, quantidade: 5 }],
    });
    assert.equal(valido.ok, true);
    assert.equal(valido.valores.sinal, 10);
    assert.deepEqual(valido.valores.itens, [{ produto_id: 12, quantidade: 5 }]);
  });

  test('adicionarItem soma quantidade quando o mesmo produto é adicionado de novo', () => {
    let itens = adicionarItem([], { id: 12, nome: 'Pão Francês', preco: 1.5 }, 5);
    itens = adicionarItem(itens, { id: 12, nome: 'Pão Francês', preco: 1.5 }, 3);
    assert.equal(itens.length, 1);
    assert.equal(itens[0].quantidade, 8);
    assert.equal(itens[0].subtotal, 12);
  });

  test('removerItem tira o produto da lista', () => {
    const itens = adicionarItem([], { id: 12, nome: 'Pão Francês', preco: 1.5 }, 5);
    const restante = removerItem(itens, 12);
    assert.equal(restante.length, 0);
  });

  test('totalLocalItens soma os subtotais — usado só como prévia, nunca enviado como total oficial', () => {
    const itens = adicionarItem(
      adicionarItem([], { id: 1, nome: 'A', preco: 2 }, 3),
      { id: 2, nome: 'B', preco: 5 },
      1,
    );
    assert.equal(totalLocalItens(itens), 11);
  });

  test('criarEncomenda envia POST /encomendas', async () => {
    const urls = [];
    const corpos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      corpos.push(JSON.parse(init.body));
      return jsonOk({ id: 3, numero: 45, total: 15, status: 'pendente' });
    };

    const resposta = await criarEncomenda({
      cliente_nome: 'Maria Souza',
      cliente_telefone: '83999998888',
      data_entrega: '2026-08-25',
      itens: [{ produto_id: 12, quantidade: 10 }],
    });
    assert.match(urls[0], /\/encomendas$/);
    assert.equal(corpos[0].cliente_nome, 'Maria Souza');
    assert.equal(resposta.numero, 45);
  });

  test('mudarStatusEncomenda envia PATCH /encomendas/:id/status', async () => {
    const urls = [];
    const metodos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      metodos.push(init.method);
      return jsonOk({ id: 3, status: 'pronto' });
    };

    await mudarStatusEncomenda(3, 'pronto');
    assert.match(urls[0], /\/encomendas\/3\/status$/);
    assert.equal(metodos[0], 'PATCH');
  });

  test('mensagemErroEncomenda devolve a mensagem do backend', () => {
    const msg = mensagemErroEncomenda(new ApiError({ status: 404, mensagem: 'Cliente não encontrado.' }));
    assert.equal(msg, 'Cliente não encontrado.');
  });
});
