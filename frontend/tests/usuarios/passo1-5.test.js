import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste, criarContainer } from '../helpers/ambiente.js';
import { ApiError } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { criarRouter } from '../../src/core/router.js';
import moduloUsuarios, {
  PERMISSOES_VALIDAS,
  aplicarErroSalvarUsuario,
  htmlModalUsuario,
  htmlSeletorPermissoes,
  htmlTabelaUsuarios,
  mensagemErroUsuario,
} from '../../src/modules/usuarios/index.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const indexHtml = readFileSync(join(frontend, 'index.html'), 'utf8');
const backendPermissoes = readFileSync(
  join(frontend, '..', 'backend', 'src', 'modules', 'users', 'domain', 'permissoes.js'),
  'utf8',
);

beforeEach(() => {
  instalarAmbienteDeTeste();
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: [],
  });
});

describe('Passo 1 — módulo admin-only e listagem', () => {
  test('contrato do módulo', () => {
    assert.equal(moduloUsuarios.id, 'usuarios');
    assert.equal(moduloUsuarios.label, 'Usuários');
    assert.equal(moduloUsuarios.permissao, 'admin');
    assert.equal(typeof moduloUsuarios.montar, 'function');
  });

  test('index.html registra só para admin', () => {
    assert.match(indexHtml, /moduloUsuarios/);
    assert.match(indexHtml, /getUsuario\(\)\?\.role === 'admin'/);
    assert.match(indexHtml, /registrarModulo\(moduloUsuarios\)/);
  });

  test('tabela lista colunas principais', () => {
    const html = htmlTabelaUsuarios([
      { id: 2, nome: 'Maria', username: 'maria', role: 'operador', ativo: 1 },
    ]);
    assert.match(html, /Maria/);
    assert.match(html, /maria/);
    assert.match(html, /Operador/);
    assert.match(html, /Ativo/);
  });
});

describe('Critério 1 — admin oculta bloco de permissões', () => {
  test('role admin não renderiza fieldset de permissões', () => {
    const html = htmlModalUsuario({ usuario: { role: 'admin', nome: 'Boss' } });
    assert.doesNotMatch(html, /usuarios-bloco-permissoes/);
    assert.doesNotMatch(html, /name="permissoes"/);
  });

  test('role operador renderiza bloco de permissões', () => {
    const html = htmlModalUsuario({ usuario: { role: 'operador', permissoes: ['caixa'] } });
    assert.match(html, /id="usuarios-bloco-permissoes"/);
    assert.match(html, /name="permissoes"/);
  });
});

describe('Critério 2 — whitelist espelha backend', () => {
  test('PERMISSOES_VALIDAS bate com backend/src/modules/users/domain/permissoes.js', () => {
    const match = backendPermissoes.match(/PERMISSOES_VALIDAS = Object\.freeze\(\[\s*([\s\S]*?)\]\)/);
    assert.ok(match, 'PERMISSOES_VALIDAS no backend');
    const idsBackend = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual([...PERMISSOES_VALIDAS], idsBackend);
  });

  test('seletor gera checkbox por permissão válida, sem extras', () => {
    const html = htmlSeletorPermissoes([]);
    for (const id of PERMISSOES_VALIDAS) {
      assert.match(html, new RegExp(`value="${id}"`));
    }
    assert.equal((html.match(/name="permissoes"/g) || []).length, PERMISSOES_VALIDAS.length);
  });
});

describe('Critério 3 — desativar própria conta desabilitado no HTML', () => {
  test('botão desativar disabled para usuário logado', () => {
    const html = htmlTabelaUsuarios(
      [
        { id: 1, nome: 'Admin', username: 'admin', role: 'admin', ativo: 1 },
        { id: 2, nome: 'Outro', username: 'outro', role: 'operador', ativo: 1 },
      ],
      { usuarioLogadoId: 1 },
    );
    assert.match(html, /data-desativar-usuario="1" disabled/);
    assert.match(html, /data-desativar-usuario="2"[^>]*>Desativar/);
    assert.doesNotMatch(html, /data-desativar-usuario="2" disabled/);
  });
});

describe('Critério 4 — username duplicado mantém modal aberto', () => {
  test('409 mapeia erro para campo username', () => {
    const modal = { aberto: true, usuario: { username: 'dup' }, erro: '', errosCampos: {} };
    aplicarErroSalvarUsuario(
      modal,
      new ApiError({ status: 409, mensagem: 'Username já existe.' }),
    );
    assert.equal(modal.erro, '');
    assert.equal(modal.errosCampos.username, 'Username já existe.');
    assert.equal(modal.aberto, true);
  });

  test('mensagemErroUsuario para 409', () => {
    assert.equal(
      mensagemErroUsuario(new ApiError({ status: 409, mensagem: 'Username já existe.' })),
      'Username já existe.',
    );
  });
});

describe('Critério 5 — menu reflete permissões após login', () => {
  test('operador com permissões parciais vê só módulos permitidos', async () => {
    salvarSessao('token-op', {
      id: 5,
      nome: 'Op',
      username: 'op',
      role: 'operador',
      permissoes: ['caixa', 'clientes'],
    });

    const menu = criarContainer();
    const conteudo = criarContainer();
    const router = criarRouter();
    const ordem = [];

    router.registrarModulo(moduloFake('pdv', 'Vendas', 'caixa', ordem));
    router.registrarModulo(moduloFake('clientes', 'Clientes', 'clientes', ordem));
    router.registrarModulo(moduloFake('estoque', 'Estoque', 'estoque', ordem));

    await router.iniciar({ menu, conteudo });

    const ids = [...menu.children].flatMap((el) => {
      if (el.tagName === 'BUTTON') {
        return [el.dataset.moduloId];
      }
      if (el.tagName === 'SELECT') {
        return [...el.children].slice(1).map((op) => op.value);
      }
      return [];
    });

    assert.deepEqual(ids.sort(), ['clientes', 'pdv'].sort());
    assert.ok(!ids.includes('estoque'));
  });
});

function moduloFake(id, label, permissao, ordem) {
  return {
    id,
    label,
    permissao,
    async montar() {
      ordem.push(`montar:${id}`);
    },
    desmontar() {},
  };
}
