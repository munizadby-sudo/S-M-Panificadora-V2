import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { aplicarSinalDoFormulario, podeConfirmarPagamento, sugerirSinalMetade } from '../../src/modules/encomendas/sinal.js';
import { htmlFormularioEncomenda } from '../../src/modules/encomendas/formulario.js';
import { htmlModalFinalizarEncomenda } from '../../src/modules/encomendas/modal-finalizar.js';
import { validarFormularioEncomenda } from '../../src/modules/encomendas/validacao.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('SPEC-FE-019 — sinal sugerido, paga depois e troco', () => {
  test('metade e trava: paga depois zera; edição na mão não é pisada', () => {
    assert.equal(sugerirSinalMetade(10), 5);
    assert.equal(sugerirSinalMetade(0), 0);
    assert.equal(
      aplicarSinalDoFormulario({ total: 10, sinalAtual: '7', pagaDepois: true, sinalEditadoNaMao: false }),
      '0',
    );
    assert.equal(
      aplicarSinalDoFormulario({ total: 10, sinalAtual: '7', pagaDepois: false, sinalEditadoNaMao: true }),
      '7',
    );
    assert.equal(
      aplicarSinalDoFormulario({ total: 10, sinalAtual: '', pagaDepois: false, sinalEditadoNaMao: false }),
      '5',
    );
  });

  test('formulario tem interruptor paga depois', () => {
    const html = htmlFormularioEncomenda({
      formulario: {
        clienteNome: '',
        clienteTelefone: '',
        dataEntrega: '2026-08-26',
        sinal: '',
        observacoes: '',
        buscaProdutoItem: '',
        produtoItem: null,
        quantidadeItem: '',
        itens: [],
      },
    });
    assert.match(html, /id="encomenda-paga-depois"/);
    assert.match(html, /Paga depois/);
  });

  test('criação com sinal pede forma; sinal 0 não pede', () => {
    const comSinal = validarFormularioEncomenda({
      clienteNome: 'Maria',
      clienteTelefone: '83900000000',
      dataEntrega: '2026-08-26',
      sinal: 5,
      itens: [{ produtoId: 1, quantidade: 1 }],
      exigirFormaDoSinal: true,
    });
    assert.equal(comSinal.ok, false);
    assert.ok(comSinal.erros.forma);

    const semSinal = validarFormularioEncomenda({
      clienteNome: 'Maria',
      clienteTelefone: '83900000000',
      dataEntrega: '2026-08-26',
      sinal: 0,
      itens: [{ produtoId: 1, quantidade: 1 }],
      exigirFormaDoSinal: true,
    });
    assert.equal(semSinal.ok, true);
    assert.equal('forma' in semSinal.valores, false);

    const comForma = validarFormularioEncomenda({
      clienteNome: 'Maria',
      clienteTelefone: '83900000000',
      dataEntrega: '2026-08-26',
      sinal: 5,
      forma: 'pix',
      itens: [{ produtoId: 1, quantidade: 1 }],
      exigirFormaDoSinal: true,
    });
    assert.equal(comForma.ok, true);
    assert.equal(comForma.valores.forma, 'pix');
  });

  test('finalizar em dinheiro mostra recebido; pix esconde; troco no saldo não no total', () => {
    const dinheiro = htmlModalFinalizarEncomenda({
      encomenda: { id: 3, numero: 4, cliente: 'Maria', data_entrega: '2026-08-26', total: 10, sinal: 5 },
      forma: 'dinheiro',
      recebido: '10',
    });
    assert.match(dinheiro, /id="encomenda-finalizar-recebido"/);
    assert.match(dinheiro, /Troco:/);
    assert.match(dinheiro, /5,00/);
    assert.doesNotMatch(dinheiro, /Troco: R\$\s*0,00/);

    const pix = htmlModalFinalizarEncomenda({
      encomenda: { id: 3, numero: 4, cliente: 'Maria', data_entrega: '2026-08-26', total: 10, sinal: 5 },
      forma: 'pix',
    });
    assert.match(pix, /encomenda-finalizar-recebido-wrap"[^>]*hidden/);
  });

  test('pode confirmar entrega só com recebido suficiente em dinheiro', () => {
    assert.equal(podeConfirmarPagamento({ valorACobrar: 50, forma: 'dinheiro', recebido: '100' }), true);
    assert.equal(podeConfirmarPagamento({ valorACobrar: 50, forma: 'dinheiro', recebido: '40' }), false);
    assert.equal(podeConfirmarPagamento({ valorACobrar: 50, forma: 'pix' }), true);
    assert.equal(podeConfirmarPagamento({ valorACobrar: 0, forma: '' }), true);
  });

  test('Confirmar entrega só libera quando o recebido cobre o saldo', () => {
    const encomenda = { id: 6, numero: 6, cliente: 'joao', data_entrega: '2026-08-26', total: 10, sinal: 5 };
    const bloqueado = htmlModalFinalizarEncomenda({ encomenda, forma: 'dinheiro', recebido: '' });
    assert.match(bloqueado, /id="btn-confirmar-finalizar-encomenda"[^>]*\bdisabled\b/);

    const liberado = htmlModalFinalizarEncomenda({ encomenda, forma: 'dinheiro', recebido: '20' });
    assert.match(liberado, /id="btn-confirmar-finalizar-encomenda"/);
    assert.doesNotMatch(liberado, /id="btn-confirmar-finalizar-encomenda"[^>]*\bdisabled\b/);
  });

  test('digitação do recebido atualiza o botão sem remontar o modal', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'encomendas', 'index.js'), 'utf8');
    assert.match(fonte, /#btn-confirmar-finalizar-encomenda/);
    assert.match(fonte, /botao\.disabled = !podeConfirmarPagamento/);
  });

  test('módulo envia forma na criação quando há sinal', () => {
    const fonte = readFileSync(join(frontend, 'src', 'modules', 'encomendas', 'index.js'), 'utf8');
    assert.match(fonte, /exigirFormaDoSinal: estado.edicaoId == null/);
    assert.match(fonte, /sincronizarSinalSugerido/);
  });
});
