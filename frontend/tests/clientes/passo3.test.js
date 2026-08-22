import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { desativarCliente, listarClientes, mensagemErroCliente, reativarCliente } from '../../src/modules/clientes/api.js';
import { htmlTabelaClientes } from '../../src/modules/clientes/lista.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['clientes'],
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

describe('Passo 3 — desativação e reativação de cliente', () => {
  test('desativarCliente envia DELETE /clientes/:id', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method });
      return jsonOk({ mensagem: 'Cliente desativado.' });
    };

    await desativarCliente(5);
    assert.equal(chamadas[0].method, 'DELETE');
    assert.match(chamadas[0].url, /\/clientes\/5$/);
  });

  test('botão da listagem é Desativar, nunca Excluir', () => {
    const html = htmlTabelaClientes([{ id: 5, nome: 'Maria Silva', telefone: '11999998888', ativo: 1 }], {
      acoes: true,
    });
    assert.match(html, />Desativar</);
    assert.match(html, /clientes-linha-ativa/);
    assert.doesNotMatch(html, /Excluir/i);
    assert.match(html, /data-desativar-cliente="5"/);
  });

  test('cliente inativo aparece marcado quando o filtro inclui inativos', () => {
    const html = htmlTabelaClientes([{ id: 5, nome: 'Maria Silva', telefone: '11999998888', ativo: 0 }], {
      acoes: true,
    });
    assert.match(html, /clientes-linha-inativa/);
    assert.match(html, /Inativo/);
    assert.match(html, />Reativar</);
    assert.match(html, /data-reativar-cliente="5"/);
    assert.doesNotMatch(html, /data-desativar-cliente/);
    assert.doesNotMatch(html, /Excluir/i);
  });

  test('reativarCliente envia POST /clientes/:id/reativar', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method });
      return jsonOk({ mensagem: 'Cliente reativado.' });
    };

    await reativarCliente(5);
    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/clientes\/5\/reativar$/);
  });

  test('fluxo incremental: some da lista padrão, reaparece com inativos e volta ao reativar', async () => {
    const clientes = [{ id: 5, nome: 'Maria Silva', telefone: '11999998888', ativo: 1 }];
    globalThis.fetch = async (url, init) => {
      const destino = String(url);
      if (init?.method === 'DELETE' && /\/clientes\/5$/.test(destino)) {
        clientes[0].ativo = 0;
        return jsonOk({ mensagem: 'Cliente desativado.' });
      }
      if (init?.method === 'POST' && /\/clientes\/5\/reativar$/.test(destino)) {
        clientes[0].ativo = 1;
        return jsonOk({ mensagem: 'Cliente reativado.' });
      }
      const ativoParam = new URL(destino, 'http://local').searchParams.get('ativo');
      const filtrados = clientes.filter((item) => {
        if (ativoParam === '1') {
          return Number(item.ativo) === 1;
        }
        return true;
      });
      return jsonOk({ data: filtrados, pagination: { page: 1, limit: 20, total: filtrados.length, pages: 1 } });
    };

    const padraoAntes = await listarClientes({ ativo: 1 });
    assert.equal(padraoAntes.data.length, 1);

    await desativarCliente(5);
    const padraoDepois = await listarClientes({ ativo: 1 });
    assert.equal(padraoDepois.data.length, 0);

    const inativos = await listarClientes({});
    assert.equal(inativos.data.length, 1);
    assert.equal(inativos.data[0].ativo, 0);

    await reativarCliente(5);
    const padraoFinal = await listarClientes({ ativo: 1 });
    assert.equal(padraoFinal.data.length, 1);
    assert.equal(padraoFinal.data[0].ativo, 1);
  });

  test('409 ao reativar usa mensagem de negócio de telefone', () => {
    const erro = new ApiError({
      status: 409,
      mensagem: 'Já existe um cliente ativo com este telefone.',
    });
    assert.equal(mensagemErroCliente(erro), 'Já existe um cliente ativo com este telefone.');
  });

  test('confirmação e botões do módulo nunca usam Excluir', () => {
    const pasta = join(frontend, 'src', 'modules', 'clientes');
    const fontes = readdirSync(pasta)
      .filter((nome) => extname(nome) === '.js')
      .map((nome) => readFileSync(join(pasta, nome), 'utf8'))
      .join('\n');
    assert.match(fontes, /Desativar este cliente\?/);
    assert.doesNotMatch(fontes, /Excluir/i);
  });
});
