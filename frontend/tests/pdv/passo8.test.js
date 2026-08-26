import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import {
  enterAdicionaDaBusca,
  indiceCategoriaPorTecla,
  deveRoubarTeclaDeEdicao,
  setasNavegamPelaGrade,
  MAPA_TECLAS_CATEGORIA,
} from '../../src/modules/pdv/atalhos.js';
import { htmlCupomNaoFiscal, imprimirCupomHtml } from '../../src/modules/pdv/cupom.js';
import { htmlLegendaAtalhos } from '../../src/modules/pdv/grade.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

beforeEach(() => {
  instalarAmbienteDeTeste();
});

describe('Passo 8 — atalhos de balcão (V1)', () => {
  test('F2 é Todas e F3–F8 seguem a ordem das categorias', () => {
    assert.equal(MAPA_TECLAS_CATEGORIA.F2, 0);
    assert.equal(indiceCategoriaPorTecla('F3'), 1);
    assert.equal(indiceCategoriaPorTecla('F8'), 6);
    assert.equal(indiceCategoriaPorTecla('F9'), undefined);
  });

  test('Delete não rouba tecla de campo digitável; Enter na busca adiciona', () => {
    assert.equal(deveRoubarTeclaDeEdicao({ target: { tagName: 'INPUT', id: 'pdv-recebido' } }), true);
    assert.equal(deveRoubarTeclaDeEdicao({ target: { tagName: 'BUTTON' } }), false);
    assert.equal(enterAdicionaDaBusca({ key: 'Enter', target: { id: 'pdv-busca' } }), true);
    assert.equal(enterAdicionaDaBusca({ key: 'Enter', target: { id: 'pdv-recebido' } }), false);
  });

  test('depois da busca, setas voltam para a grade (F2/categoria e ↑↓ na busca)', () => {
    const busca = { tagName: 'INPUT', id: 'pdv-busca' };
    const categoria = { tagName: 'SELECT', id: 'pdv-categoria' };
    assert.equal(setasNavegamPelaGrade({ key: 'ArrowDown', target: busca }), true);
    assert.equal(setasNavegamPelaGrade({ key: 'ArrowUp', target: busca }), true);
    assert.equal(setasNavegamPelaGrade({ key: 'ArrowRight', target: busca }), false);
    assert.equal(setasNavegamPelaGrade({ key: 'ArrowRight', target: categoria }), true);
    assert.equal(setasNavegamPelaGrade({ key: 'ArrowLeft', target: categoria }), true);
    assert.equal(setasNavegamPelaGrade({ key: 'ArrowRight', target: { tagName: 'BUTTON' } }), true);
    assert.equal(setasNavegamPelaGrade({ key: 'ArrowDown', target: { tagName: 'INPUT', id: 'pdv-recebido' } }), false);
  });

  test('legenda visível documenta F1, F2–F8, Delete e Esc, sem summary', () => {
    const html = htmlLegendaAtalhos();
    assert.match(html, /<ul class="pdv-atalhos">/);
    assert.doesNotMatch(html, /<details/);
    assert.doesNotMatch(html, /<summary/);
    assert.match(html, /<kbd>F1<\/kbd>/);
    assert.match(html, /F2/);
    assert.match(html, /F8/);
    assert.match(html, /<kbd>Del<\/kbd>/);
    assert.match(html, /<kbd>Esc<\/kbd>/);
    assert.match(html, /<kbd>F10<\/kbd>/);
  });

  test('módulo coloca a legenda acima do título Vendas', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'index.js'), 'utf8');
    assert.match(fonte, /htmlLegendaAtalhos\(\)/);
    assert.match(fonte, /<header class="pdv-topo">/);
  });

  test('módulo registra o mapa completo de atalhos, não só F10', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'index.js'), 'utf8');
    assert.match(fonte, /tratarAtalhoPdv/);
    assert.match(fonte, /F1/);
    assert.match(fonte, /Delete/);
    assert.match(fonte, /indiceCategoriaPorTecla/);
    assert.match(fonte, /capturarFocoUi/);
    assert.match(fonte, /restaurarFocoUi/);
    assert.match(fonte, /defaultPrevented/);
    assert.match(fonte, /setasNavegamPelaGrade/);
    assert.match(fonte, /focarGrade/);
  });
});

describe('Passo 8 — cupom não fiscal', () => {
  test('html traz número, itens, total e aviso de não fiscal', () => {
    const html = htmlCupomNaoFiscal({
      venda: { numero: 1024, total: 12.75, forma_pagamento: 'pix' },
      itens: [{ nome: 'Pão Francês', quantidade: 3, precoUnitario: 1.5, subtotal: 4.5 }],
      nomeLoja: 'S&M Panificadora',
      operador: 'Maria',
      dataHora: '26/08/2026, 08:00:00',
    });
    assert.match(html, /CUPOM NÃO FISCAL/);
    assert.match(html, /Pedido Nº 1024/);
    assert.match(html, /Pão Francês/);
    assert.match(html, /Maria/);
    assert.match(html, /Pix/);
    assert.match(html, /Este ticket não é documento fiscal/);
    assert.doesNotMatch(html, /Recebido/);
  });

  test('dinheiro inclui recebido e troco', () => {
    const html = htmlCupomNaoFiscal({
      venda: { numero: 7, total: 10, forma_pagamento: 'dinheiro' },
      itens: [{ nome: 'Broa', quantidade: 1, precoUnitario: 10, subtotal: 10 }],
      recebido: '20',
    });
    assert.match(html, /Recebido/);
    assert.match(html, /Troco/);
  });

  test('imprimirCupomHtml escreve na janela sem noopener', async () => {
    const docs = [];
    const janela = {
      document: {
        open() {},
        write(html) {
          docs.push(html);
        },
        close() {},
      },
      focus() {},
      print() {
        docs.push('print');
      },
    };
    let argsAbertura;
    await imprimirCupomHtml('<p>ok</p>', (...args) => {
      argsAbertura = args;
      return janela;
    });
    assert.deepEqual(argsAbertura, ['', '_blank']);
    assert.equal(docs[0], '<p>ok</p>');
    assert.ok(docs.includes('print'));
  });
});
