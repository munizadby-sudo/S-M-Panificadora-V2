import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { atualizarCliente, criarCliente, mensagemErroCliente } from '../../src/modules/clientes/api.js';
import { aplicarErroSalvarCliente, htmlModalCliente } from '../../src/modules/clientes/modal-cliente.js';
import { validarCliente } from '../../src/modules/clientes/validacao.js';

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

function jsonOk(corpo, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 2 — cadastro e edição de cliente', () => {
  test('validarCliente exige nome e telefone com ao menos 8 dígitos', () => {
    const vazio = validarCliente({});
    assert.equal(vazio.ok, false);
    assert.match(vazio.erros.nome, /obrigatório/);
    assert.match(vazio.erros.telefone, /obrigatório/);

    const telefoneCurto = validarCliente({ nome: 'Maria', telefone: '123' });
    assert.equal(telefoneCurto.ok, false);
    assert.match(telefoneCurto.erros.telefone, /8 dígitos/);

    const ok = validarCliente({ nome: 'Maria Silva', telefone: '(11) 99999-8888' });
    assert.equal(ok.ok, true);
    assert.equal(ok.valores.nome, 'Maria Silva');
    assert.equal(ok.valores.telefone, '(11) 99999-8888');
  });

  test('modal tem nome e telefone', () => {
    const html = htmlModalCliente({ cliente: { id: 5, nome: 'Maria Silva', telefone: '11999998888' } });
    assert.match(html, /Editar cliente/);
    assert.match(html, /id="cliente-nome"/);
    assert.match(html, /id="cliente-telefone"/);
    assert.match(html, /Maria Silva/);
    assert.match(html, /11999998888/);
  });

  test('modal novo cliente exibe título correto', () => {
    const html = htmlModalCliente({ cliente: {} });
    assert.match(html, /Novo cliente/);
    assert.match(html, /id="form-cliente"/);
  });

  test('criarCliente e atualizarCliente usam POST e PUT', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method, body: init?.body });
      return jsonOk({ id: 5, nome: 'Maria Silva', telefone: '11999998888', ativo: 1 });
    };

    await criarCliente({ nome: 'Maria Silva', telefone: '11999998888' });
    await atualizarCliente(5, { nome: 'Maria Souza', telefone: '11999997777' });

    assert.equal(chamadas[0].method, 'POST');
    assert.match(chamadas[0].url, /\/clientes$/);
    assert.equal(chamadas[1].method, 'PUT');
    assert.match(chamadas[1].url, /\/clientes\/5$/);
  });

  test('409 de telefone duplicado vira mensagem de negócio e não fecha o modal', () => {
    const erro = new ApiError({
      status: 409,
      codigo: 'TELEFONE_JA_CADASTRADO',
      mensagem: 'Já existe um cliente ativo com este telefone.',
    });
    assert.equal(mensagemErroCliente(erro), 'Já existe um cliente ativo com este telefone.');

    const modal = aplicarErroSalvarCliente(
      { aberto: true, cliente: { nome: 'Maria', telefone: '11999998888' }, erro: '', errosCampos: {} },
      erro,
    );
    assert.equal(modal.aberto, true);
    assert.equal(modal.erro, 'Já existe um cliente ativo com este telefone.');
    assert.deepEqual(modal.errosCampos, {});
  });

  test('400 de telefone inválido aparece no campo e o modal permanece aberto', () => {
    const erro = new ApiError({ status: 400, mensagem: 'Telefone deve ter pelo menos 8 dígitos.' });
    const modal = aplicarErroSalvarCliente({ aberto: true, cliente: {}, erro: '', errosCampos: {} }, erro);
    assert.equal(modal.aberto, true);
    assert.equal(modal.errosCampos.telefone, 'Telefone deve ter pelo menos 8 dígitos.');
    assert.equal(modal.erro, '');
  });

  test('nenhum arquivo do módulo usa a palavra Excluir', () => {
    const pasta = join(frontend, 'src', 'modules', 'clientes');
    for (const nome of readdirSync(pasta).filter((arquivo) => extname(arquivo) === '.js')) {
      const fonte = readFileSync(join(pasta, nome), 'utf8');
      assert.doesNotMatch(fonte, /Excluir/i, `${nome} não pode usar Excluir`);
    }
  });
});
