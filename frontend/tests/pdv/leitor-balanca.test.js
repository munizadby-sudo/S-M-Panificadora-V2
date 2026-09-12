import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import {
  decodificarCodigoBalanca,
  pesoDoCodigoBalanca,
  perfisDisponiveis,
} from '../../src/modules/pdv/leitor-balanca.js';
import { adicionarAoCarrinho } from '../../src/modules/pdv/carrinho.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Etiqueta real da Filizola Platina, conferida em 2026-09-12 (docs/depois-do-teste.md item 6):
// Queijo Mussarela, peso 0,220kg, R$/kg 47,00, total R$ 10,34.
const CODIGO_REAL_FILIZOLA = '2000001010341';

describe('Leitor de balança (item 6, docs/depois-do-teste.md)', () => {
  test('decodifica a etiqueta real da Filizola: PLU e valor batem', () => {
    const resultado = decodificarCodigoBalanca(CODIGO_REAL_FILIZOLA, 'filizola');
    assert.deepEqual(resultado, { codigoProduto: '00001', valorCentavos: 1034 });
  });

  test('peso derivado do valor ÷ preço/kg do cadastro bate com a etiqueta (0,220kg)', () => {
    const resultado = decodificarCodigoBalanca(CODIGO_REAL_FILIZOLA, 'filizola');
    const peso = pesoDoCodigoBalanca(resultado.valorCentavos, 47);
    assert.equal(peso, 0.22);
  });

  test('dígito verificador errado não decodifica', () => {
    const codigoAdulterado = CODIGO_REAL_FILIZOLA.slice(0, 12) + '9';
    assert.equal(decodificarCodigoBalanca(codigoAdulterado, 'filizola'), null);
  });

  test('prefixo fora do perfil configurado não decodifica', () => {
    // mesmo código, mas outro perfil não tem o prefixo "20"
    assert.equal(decodificarCodigoBalanca(CODIGO_REAL_FILIZOLA, 'outra-marca-inexistente'), null);
  });

  test('menos ou mais de 13 dígitos não decodifica', () => {
    assert.equal(decodificarCodigoBalanca('200000101034', 'filizola'), null);
    assert.equal(decodificarCodigoBalanca('20000010103411', 'filizola'), null);
  });

  test('texto que não é só dígitos não decodifica', () => {
    assert.equal(decodificarCodigoBalanca('pão francês', 'filizola'), null);
  });

  test('pesoDoCodigoBalanca sem preço/kg válido no cadastro não quebra, devolve null', () => {
    assert.equal(pesoDoCodigoBalanca(1034, 0), null);
    assert.equal(pesoDoCodigoBalanca(1034, null), null);
    assert.equal(pesoDoCodigoBalanca(1034, -5), null);
  });

  test('perfisDisponiveis lista pelo menos a Filizola', () => {
    const perfis = perfisDisponiveis();
    assert.ok(perfis.some((p) => p.id === 'filizola'));
  });
});

describe('Carrinho recebe peso da balança (adicionarAoCarrinho com quantidade explícita)', () => {
  const mussarela = { id: 20, nome: 'Queijo Mussarela', preco: 47, tipo_estoque: 'peso', codigo_balanca: '00001' };

  test('adiciona com o peso decodificado, não 1 unidade', () => {
    const carrinho = adicionarAoCarrinho([], mussarela, 0.22);
    assert.equal(carrinho[0].quantidade, 0.22);
    assert.equal(carrinho[0].subtotal, 10.34);
  });

  test('escanear o mesmo produto duas vezes soma os pesos, não incrementa 1', () => {
    let carrinho = adicionarAoCarrinho([], mussarela, 0.22);
    carrinho = adicionarAoCarrinho(carrinho, mussarela, 0.15);
    assert.equal(carrinho.length, 1);
    assert.equal(carrinho[0].quantidade, 0.37);
    assert.equal(carrinho[0].subtotal, 17.39);
  });

  test('sem quantidade explícita continua incrementando 1 (unidade, comportamento de sempre)', () => {
    const pao = { id: 1, nome: 'Pão Francês', preco: 0.5 };
    let carrinho = adicionarAoCarrinho([], pao);
    carrinho = adicionarAoCarrinho(carrinho, pao);
    assert.equal(carrinho[0].quantidade, 2);
  });
});

describe('PDV liga a leitura da balança no Enter da busca (13 dígitos)', () => {
  const fonte = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'index.js'), 'utf8');

  test('index.js decodifica antes de tratar como busca de texto', () => {
    assert.match(fonte, /decodificarCodigoBalanca/);
    assert.match(fonte, /pesoDoCodigoBalanca/);
    assert.match(fonte, /\^\\d\{13\}\$/);
  });

  test('código não reconhecido avisa e não quebra (item 6: "não reconheci")', () => {
    assert.match(fonte, /[Nn]ão reconheci/);
  });

  test('carrega o perfil de balança da configuração pública ao montar', () => {
    assert.match(fonte, /perfil_balanca/);
    assert.match(fonte, /carregarPerfilBalanca/);
  });
});
