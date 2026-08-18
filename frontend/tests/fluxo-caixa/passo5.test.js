import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { montarLinhasCsv } from '../../src/modules/fluxo-caixa/util.js';

const itens = [
  {
    id: 1,
    tipo: 'entrada',
    descricao: 'Venda #1',
    categoria: 'vendas',
    forma: 'dinheiro',
    valor: 4.5,
    gerado_auto: 1,
    usuario: 'Admin',
    data: '2026-08-17',
  },
  {
    id: 2,
    tipo: 'saida',
    descricao: 'Sangria, caixa',
    categoria: 'sangria',
    forma: 'dinheiro',
    valor: 10,
    gerado_auto: 0,
    usuario: 'Operador',
    data: '2026-08-17',
  },
];

describe('Passo 5 — exportação CSV no frontend', () => {
  test('montarLinhasCsv reflete exatamente os itens visíveis na listagem', () => {
    const csv = montarLinhasCsv(itens);
    const linhas = csv.split('\n');

    assert.match(linhas[0], /tipo;descricao;categoria;forma;valor;origem;usuario;data/);
    assert.match(linhas[1], /Entrada/);
    assert.match(linhas[1], /Venda #1/);
    assert.match(linhas[1], /Automático/);
    assert.match(linhas[2], /Saída/);
    assert.match(linhas[2], /Sangria, caixa/);
    assert.match(linhas[2], /Manual/);
    assert.match(linhas[2], /10,00/);
  });

  test('CSV escapa aspas em descrições', () => {
    const csv = montarLinhasCsv([
      {
        ...itens[0],
        descricao: 'Item "especial"',
      },
    ]);
    assert.match(csv, /""especial""/);
  });
});
