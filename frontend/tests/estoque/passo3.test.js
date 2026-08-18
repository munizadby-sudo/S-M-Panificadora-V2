import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { atualizarEstoque, listarEstoque } from '../../src/modules/estoque/api.js';
import { htmlTabelaEstoque } from '../../src/modules/estoque/lista.js';
import { aplicarErroSalvarEstoque, htmlModalEdicaoEstoque } from '../../src/modules/estoque/modal-edicao.js';
import { validarLancamentoEstoque } from '../../src/modules/estoque/validacao.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['estoque'],
  });
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

const item = {
  produto_id: 12,
  nome: 'Pão Francês',
  data: '2026-08-17',
  inicial: 20,
  produzido: 50,
  vendido: 18,
  disponivel: 52,
  minimo: 10,
  abaixo_do_minimo: false,
};

describe('Passo 3 — edição individual', () => {
  test('modal edita inicial, produzido e mínimo; vendido e disponível são só leitura', () => {
    const html = htmlModalEdicaoEstoque({ item });
    assert.match(html, /id="estoque-inicial"/);
    assert.match(html, /id="estoque-produzido"/);
    assert.match(html, /id="estoque-minimo"/);
    assert.match(html, /estoque-somente-leitura/);
    assert.match(html, /Vendido/);
    assert.match(html, /Disponível/);
    assert.doesNotMatch(html, /name="vendido"/);
    assert.doesNotMatch(html, /name="disponivel"/);
    assert.doesNotMatch(html, /id="estoque-vendido"/);
    assert.doesNotMatch(html, /id="estoque-disponivel"/);
    assert.doesNotMatch(html, /<input[^>]*(vendido|disponivel)/i);
  });

  test('listagem ganha ação Editar sem tornar vendido/disponível editáveis', () => {
    const html = htmlTabelaEstoque([item], { acoes: true });
    assert.match(html, /data-editar-estoque="12"/);
    assert.match(html, />Editar</);
    assert.doesNotMatch(html, /<input/i);
  });

  test('validarLancamentoEstoque rejeita valores negativos', () => {
    const invalido = validarLancamentoEstoque({ inicial: '-1', produzido: '0', minimo: '10' });
    assert.equal(invalido.ok, false);
    assert.match(invalido.erros.inicial, /negativo/);

    const ok = validarLancamentoEstoque({ inicial: '20', produzido: '50', minimo: '10' });
    assert.equal(ok.ok, true);
    assert.equal(ok.valores.inicial, 20);
    assert.equal(ok.valores.produzido, 50);
    assert.equal(ok.valores.minimo, 10);
  });

  test('atualizarEstoque envia PUT /estoque/:produtoId sem vendido', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method, body: init?.body });
      return jsonOk({ ...item, inicial: 30, produzido: 40, disponivel: 52 });
    };

    await atualizarEstoque(12, { data: '2026-08-17', inicial: 30, produzido: 40, minimo: 10 });
    assert.equal(chamadas[0].method, 'PUT');
    assert.match(chamadas[0].url, /\/estoque\/12$/);
    const corpo = JSON.parse(chamadas[0].body);
    assert.equal(corpo.inicial, 30);
    assert.equal(corpo.produzido, 40);
    assert.equal(corpo.minimo, 10);
    assert.equal(corpo.vendido, undefined);
  });

  test('edição individual atualiza disponível na listagem após salvar', async () => {
    let registro = { ...item };

    globalThis.fetch = async (url, init) => {
      const destino = String(url);
      if (init?.method === 'PUT' && /\/estoque\/12$/.test(destino)) {
        const corpo = JSON.parse(init.body);
        registro = {
          ...registro,
          inicial: corpo.inicial,
          produzido: corpo.produzido,
          minimo: corpo.minimo,
          disponivel: corpo.inicial + corpo.produzido - registro.vendido,
        };
        return jsonOk(registro);
      }
      if (/\/estoque/.test(destino)) {
        return jsonOk({
          data: [registro],
          pagination: { page: 1, limit: 100, total: 1, pages: 1, hasPrevious: false, hasNext: false },
        });
      }
      return jsonOk({ data: [] });
    };

    await atualizarEstoque(12, { data: '2026-08-17', inicial: 100, produzido: 50, minimo: 15 });
    const lista = await listarEstoque();
    assert.equal(lista.data[0].inicial, 100);
    assert.equal(lista.data[0].produzido, 50);
    assert.equal(lista.data[0].vendido, 18);
    assert.equal(lista.data[0].disponivel, 132);

    const html = htmlTabelaEstoque(lista.data, { acoes: true });
    assert.match(html, /132/);
    assert.match(html, /data-editar-estoque="12"/);
  });

  test('400 de valor negativo aparece no campo e o modal permanece aberto', () => {
    const erro = new ApiError({ status: 400, mensagem: 'inicial não pode ser negativo.' });
    const modal = aplicarErroSalvarEstoque(
      { aberto: true, item: { ...item }, erro: '', errosCampos: {} },
      erro,
    );
    assert.equal(modal.aberto, true);
    assert.equal(modal.errosCampos.inicial, 'inicial não pode ser negativo.');
    assert.equal(modal.erro, '');
  });
});
