import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { formatarMoeda } from '../src/core/utils.js';
import { atualizarDisponivelPreviaLinha } from '../src/modules/estoque/tabela-lote.js';
import { calcularPreviaCusto } from '../src/modules/perdas/validacao.js';
import { atualizarTrocoNoDom } from '../src/modules/pdv/pagamento.js';
import {
  criarInputComFoco,
  simularDigitacaoComFoco,
} from './helpers/previa-sem-perder-foco.js';

const itensCarrinho = [{ subtotal: 4.5 }];
const produtoPerda = { id: 12, nome: 'Pão', custo: 0.3 };

function montarContainerPdv() {
  const troco = { hidden: true, textContent: '' };
  const wrap = { hidden: false };
  const input = criarInputComFoco('');
  const container = {
    querySelector(seletor) {
      if (seletor === '#pdv-recebido') {
        return input;
      }
      if (seletor === '#pdv-troco') {
        return troco;
      }
      if (seletor === '#pdv-recebido-wrap') {
        return wrap;
      }
      return null;
    },
  };
  return { container, input, troco };
}

function montarContainerPerdas() {
  const bloco = { textContent: '—' };
  const input = criarInputComFoco('');
  const container = {
    querySelector(seletor) {
      if (seletor === '#perda-quantidade') {
        return input;
      }
      if (seletor === '.perdas-previa-custo strong') {
        return bloco;
      }
      return null;
    },
  };
  return { container, input, bloco };
}

function atualizarPreviaPerdasNoDom(container, quantidade) {
  const previa = calcularPreviaCusto(produtoPerda, quantidade);
  const bloco = container.querySelector('.perdas-previa-custo strong');
  if (bloco && previa != null) {
    bloco.textContent = formatarMoeda(previa);
  }
}

function montarContainerEstoqueLote() {
  const inputInicial = criarInputComFoco('10');
  const inputProduzido = { value: '0' };
  const disponivel = { textContent: '10' };
  const container = {
    querySelector(seletor) {
      if (seletor === '[data-lote-inicial="12"]') {
        return inputInicial;
      }
      if (seletor === '[data-lote-produzido="12"]') {
        return inputProduzido;
      }
      if (seletor === '[data-lote-disponivel="12"]') {
        return disponivel;
      }
      return null;
    },
  };
  return { container, inputInicial, disponivel };
}

describe('prévia em tempo real sem perder foco', () => {
  test('PDV — valor recebido mantém foco enquanto o troco atualiza', () => {
    const { container, input, troco } = montarContainerPdv();

    simularDigitacaoComFoco(input, ['1', '0', '.', '5', '0'], (valor) => {
      atualizarTrocoNoDom(container, {
        recebido: valor,
        itens: itensCarrinho,
        formaPagamento: 'dinheiro',
      });
      assert.equal(container.querySelector('#pdv-recebido'), input);
    });

    assert.equal(troco.hidden, false);
    assert.match(troco.textContent, /Troco: R\$ 6,00/);
  });

  test('Perdas — quantidade mantém foco enquanto a prévia de custo atualiza', () => {
    const { container, input, bloco } = montarContainerPerdas();

    simularDigitacaoComFoco(input, ['1', '0', '.', '5'], (valor) => {
      atualizarPreviaPerdasNoDom(container, valor);
      assert.equal(container.querySelector('#perda-quantidade'), input);
    });

    assert.match(bloco.textContent, /R\$ 3,15/);
  });

  test('Estoque lote — inicial/produzido mantém foco enquanto disponível atualiza', () => {
    const { container, inputInicial, disponivel } = montarContainerEstoqueLote();

    simularDigitacaoComFoco(inputInicial, ['1', '2', '.', '5'], () => {
      atualizarDisponivelPreviaLinha(container, 12, 2);
      assert.equal(container.querySelector('[data-lote-inicial="12"]'), inputInicial);
    });

    assert.equal(disponivel.textContent, '10,5');
  });
});
