import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { criarContainer, instalarAmbienteDeTeste } from './helpers/ambiente.js';
import { criarRouter } from '../src/core/router.js';
import { salvarSessao } from '../src/core/session.js';

const usuarioOperador = {
  id: 2,
  nome: 'Caixa',
  username: 'caixa',
  role: 'operador',
  permissoes: ['caixa'],
};

beforeEach(() => {
  instalarAmbienteDeTeste();
  salvarSessao('token', usuarioOperador);
});

describe('router', () => {
  test('menu só inclui módulos permitidos ao usuário', async () => {
    const menu = criarContainer();
    const conteudo = criarContainer();
    const router = criarRouter();
    const ordem = [];

    router.registrarModulo(moduloFake('pdv', 'Vendas', 'caixa', ordem));
    router.registrarModulo(moduloFake('estoque', 'Estoque', 'estoque', ordem));

    await router.iniciar({ menu, conteudo });

    assert.deepEqual(idsDoMenu(menu), ['pdv']);
    assert.equal(menu.children.length, 1);
    assert.equal(menu.children[0].tagName, 'BUTTON');
    assert.equal(router.obterModuloAtual().id, 'pdv');
    assert.deepEqual(ordem, ['montar:pdv']);
  });

  test('menu mostra operacionais como botões e administrativos em Mais', async () => {
    const usuarioAdmin = {
      ...usuarioOperador,
      role: 'admin',
      permissoes: [],
    };
    salvarSessao('token-admin', usuarioAdmin);

    const menu = criarContainer();
    const conteudo = criarContainer();
    const router = criarRouter();

    router.registrarModulo(moduloFake('encomendas', 'Encomendas', 'encomendas', []));
    router.registrarModulo(moduloFake('estoque', 'Estoque', 'estoque', []));
    router.registrarModulo(moduloFake('fluxo', 'Fluxo', 'fluxo', []));
    router.registrarModulo(moduloFake('produtos', 'Produtos', 'produtos', []));
    router.registrarModulo(moduloFake('relatorios', 'Relatórios', 'rel', []));

    await router.iniciar({ menu, conteudo, moduloInicial: 'encomendas' });

    const botoes = menu.children.filter((el) => el.tagName === 'BUTTON');
    const selects = menu.children.filter((el) => el.tagName === 'SELECT');
    assert.equal(botoes.length, 3);
    assert.equal(selects.length, 1);
    assert.deepEqual(
      botoes.map((b) => b.dataset.moduloId),
      ['encomendas', 'estoque', 'fluxo'],
    );
    assert.deepEqual(
      [...selects[0].children].slice(1).map((op) => op.value),
      ['produtos', 'relatorios'],
    );
  });

  test('trocar de módulo chama desmontar do atual antes de montar o novo', async () => {
    const usuarioAdmin = {
      ...usuarioOperador,
      role: 'admin',
      permissoes: [],
    };
    salvarSessao('token-admin', usuarioAdmin);

    const menu = criarContainer();
    const conteudo = criarContainer();
    const router = criarRouter();
    const ordem = [];

    router.registrarModulo(moduloFake('pdv', 'Vendas', 'caixa', ordem));
    router.registrarModulo(moduloFake('estoque', 'Estoque', 'estoque', ordem));

    await router.iniciar({ menu, conteudo, moduloInicial: 'pdv' });
    await router.navegarPara('estoque');

    assert.deepEqual(ordem, ['montar:pdv', 'desmontar:pdv', 'montar:estoque']);
    assert.equal(router.obterModuloAtual().id, 'estoque');
  });

  test('sem módulos, não monta tela de negócio e mostra estado vazio', async () => {
    const menu = criarContainer();
    const conteudo = criarContainer();
    const router = criarRouter();

    await router.iniciar({ menu, conteudo });

    assert.equal(menu.children.length, 0);
    assert.equal(router.obterModuloAtual(), null);
    assert.match(conteudo.innerHTML, /Nenhum módulo disponível/);
  });
});

function idsDoMenu(menu) {
  const ids = [];
  for (const el of menu.children) {
    if (el.dataset?.moduloId) {
      ids.push(el.dataset.moduloId);
    }
    if (el.tagName === 'SELECT') {
      for (const op of el.children || []) {
        if (op.value) {
          ids.push(op.value);
        }
      }
    }
  }
  return ids;
}

function moduloFake(id, label, permissao, ordem) {
  return {
    id,
    label,
    icone: 'ti-test',
    permissao,
    async montar(container) {
      ordem.push(`montar:${id}`);
      if (container) {
        container.innerHTML = `<section data-modulo="${id}"></section>`;
      }
    },
    desmontar() {
      ordem.push(`desmontar:${id}`);
    },
  };
}
