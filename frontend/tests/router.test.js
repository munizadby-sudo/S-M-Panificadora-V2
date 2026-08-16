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

    assert.deepEqual(
      menu.children.map((botao) => botao.dataset.moduloId),
      ['pdv'],
    );
    assert.equal(router.obterModuloAtual().id, 'pdv');
    assert.deepEqual(ordem, ['montar:pdv']);
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
