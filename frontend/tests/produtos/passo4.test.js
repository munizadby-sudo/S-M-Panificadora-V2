import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { desativarProduto, listarProdutos, mensagemErroProduto, reativarProduto } from '../../src/modules/produtos/api.js';
import { htmlTabelaProdutos } from '../../src/modules/produtos/lista.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['produtos'],
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

describe('Passo 4 — desativação de produto', () => {
  test('desativarProduto envia DELETE /produtos/:id', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method });
      return jsonOk({ mensagem: 'Produto desativado.' });
    };

    await desativarProduto(12);
    assert.equal(chamadas[0].method, 'DELETE');
    assert.match(chamadas[0].url, /\/produtos\/12$/);
  });

  test('botão da listagem é Desativar, nunca Excluir', () => {
    const html = htmlTabelaProdutos(
      [{ id: 12, nome: 'Pão Francês', categoria_id: 3, categoria_nome: 'Pães', preco: 0.75, custo: 0.3, ativo: 1 }],
      [{ id: 3, nome: 'Pães' }],
      { acoes: true, podeDesativar: true },
    );
    assert.match(html, />Desativar</);
    assert.match(html, /produtos-linha-ativa/);
    assert.doesNotMatch(html, /Excluir/i);
    assert.match(html, /data-desativar-produto="12"/);
  });

  test('produto inativo some da listagem padrão (ativo=1) e reaparece sem o filtro', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({ data: [], pagination: { page: 1, limit: 50, total: 0, pages: 1 } });
    };

    await listarProdutos({ ativo: 1 });
    await listarProdutos({});

    assert.match(urls[0], /ativo=1/);
    assert.doesNotMatch(urls[1], /ativo=/);
  });

  test('produto inativo aparece marcado quando o filtro inclui inativos', () => {
    const html = htmlTabelaProdutos(
      [{ id: 12, nome: 'Pão Francês', categoria_id: 3, categoria_nome: 'Pães', preco: 0.75, custo: 0.3, ativo: 0 }],
      [{ id: 3, nome: 'Pães' }],
      { acoes: true, podeDesativar: true },
    );
    assert.match(html, /produtos-linha-inativa/);
    assert.doesNotMatch(html, /produtos-linha-ativa/);
    assert.match(html, />Reativar</);
    assert.match(html, /data-reativar-produto="12"/);
    assert.doesNotMatch(html, /data-desativar-produto/);
    assert.doesNotMatch(html, /Excluir/i);
  });

  test('reativarProduto envia POST /produtos/:id/reativar', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method });
      return jsonOk({ mensagem: 'Produto reativado.' });
    };

    await reativarProduto(12);
    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/produtos\/12\/reativar$/);
  });

  test('fluxo incremental: some da lista padrão, reaparece com inativos e volta ao reativar', async () => {
    const produtos = [
      { id: 12, nome: 'Pão Francês', categoria_id: 3, preco: 0.75, custo: 0.3, ativo: 1 },
    ];
    globalThis.fetch = async (url, init) => {
      const destino = String(url);
      if (init?.method === 'DELETE' && /\/produtos\/12$/.test(destino)) {
        produtos[0].ativo = 0;
        return jsonOk({ mensagem: 'Produto desativado.' });
      }
      if (init?.method === 'POST' && /\/produtos\/12\/reativar$/.test(destino)) {
        produtos[0].ativo = 1;
        return jsonOk({ mensagem: 'Produto reativado.' });
      }
      const ativoParam = new URL(destino).searchParams.get('ativo');
      const filtrados = produtos.filter((item) => {
        if (ativoParam === '1') {
          return Number(item.ativo) === 1;
        }
        if (ativoParam === '0') {
          return Number(item.ativo) === 0;
        }
        return true;
      });
      return jsonOk({ data: filtrados, pagination: { page: 1, limit: 50, total: filtrados.length, pages: 1 } });
    };

    const padraoAntes = await listarProdutos({ ativo: 1 });
    assert.equal(padraoAntes.data.length, 1);

    await desativarProduto(12);
    const padraoDepois = await listarProdutos({ ativo: 1 });
    assert.equal(padraoDepois.data.length, 0);

    const inativos = await listarProdutos({});
    assert.equal(inativos.data.length, 1);
    assert.equal(inativos.data[0].ativo, 0);

    await reativarProduto(12);
    const padraoFinal = await listarProdutos({ ativo: 1 });
    assert.equal(padraoFinal.data.length, 1);
    assert.equal(padraoFinal.data[0].ativo, 1);
  });

  test('409 ao reativar usa a mesma mensagem de negócio do cadastro', () => {
    const erro = new ApiError({
      status: 409,
      mensagem: 'Já existe um produto com este nome nesta categoria.',
    });
    assert.equal(mensagemErroProduto(erro), 'Já existe um produto com esse nome nessa categoria.');
  });

  test('confirmação e botões do módulo nunca usam Excluir', () => {
    const pasta = join(frontend, 'src', 'modules', 'produtos');
    const fontes = readdirSync(pasta)
      .filter((nome) => extname(nome) === '.js')
      .map((nome) => readFileSync(join(pasta, nome), 'utf8'))
      .join('\n');
    assert.match(fontes, /Desativar este produto\?/);
    assert.match(fontes, /Desativar esta categoria\?/);
    assert.doesNotMatch(fontes, /Excluir/i);
  });
});
