import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import {
  formatarDataEntrega,
  htmlCupomEncomendaDuasVias,
} from '../../src/modules/encomendas/cupom.js';
import { htmlTabelaEncomendas } from '../../src/modules/encomendas/lista.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const encomenda = {
  id: 3,
  numero: 45,
  cliente_nome: 'Maria Souza',
  cliente_telefone: '83999998888',
  data_entrega: '2026-08-25',
  sinal: 20,
  total: 40,
  saldo_a_receber: 20,
  observacoes: 'Sem cebola',
  forma_sinal: 'dinheiro',
};

const itens = [
  { nome: 'Bolo de milho', quantidade: 1, precoUnitario: 40, subtotal: 40 },
];

describe('Passo 7 — comprovante de encomenda em duas vias', () => {
  test('data de entrega não vira o dia anterior por fuso', () => {
    assert.equal(formatarDataEntrega('2026-08-25'), '25/08/2026');
  });

  test('um cupom traz via do cliente e via da loja, no mesmo papel', () => {
    const html = htmlCupomEncomendaDuasVias({
      encomenda,
      itens,
      recebidoSinal: '20',
      operador: 'Admin',
      dataHora: '30/08/2026, 18:10',
    });
    assert.match(html, /VIA CLIENTE/);
    assert.match(html, /VIA ESTABELECIMENTO/);
    assert.match(html, /Encomenda Nº 0045/);
    assert.match(html, /25\/08\/2026/);
    assert.match(html, /Maria Souza/);
    assert.match(html, /83999998888/);
    assert.match(html, /Bolo de milho/);
    assert.match(html, /Saldo a pagar/);
    assert.match(html, /Sem cebola/);
    assert.match(html, /Guarde este comprovante/);
    assert.match(html, /Via da loja/);
    assert.match(html, /corte/);
    assert.doesNotMatch(html, /window\.open|_blank/);
  });

  test('lista oferece Imprimir em encomenda ativa e entregue, não na cancelada', () => {
    const ativa = htmlTabelaEncomendas([encomenda]);
    const entregue = htmlTabelaEncomendas([{ ...encomenda, status: 'entregue' }]);
    const cancelada = htmlTabelaEncomendas([{ ...encomenda, ativo: 0 }]);

    assert.match(ativa, /data-imprimir-encomenda="3"/);
    assert.match(entregue, /data-imprimir-encomenda="3"/);
    assert.doesNotMatch(entregue, /data-editar-encomenda/);
    assert.doesNotMatch(cancelada, /data-imprimir-encomenda/);
  });

  test('módulo imprime no iframe, sem aba nova', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'encomendas', 'cupom.js'), 'utf8');
    assert.match(fonte, /imprimirHtmlEmIframe/);
    assert.match(fonte, /abrirModalImpressaoCupom/);
    assert.match(fonte, /2 vias/);
    assert.doesNotMatch(fonte, /window\.open|abrirJanela|_blank/);
  });
});
