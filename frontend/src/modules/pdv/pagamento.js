import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';
import { dinheiroPdv, totalLocal } from './carrinho.js';

/** Atalhos 1/2/3 no painel de pagamento (Passo 6). */
export const ATALHOS_FORMA_PAGAMENTO = Object.freeze(['dinheiro', 'pix', 'cartao']);

export const FORMAS_PAGAMENTO = Object.freeze([
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'pix', label: 'Pix' },
  { id: 'cartao', label: 'Débito' },
  { id: 'credito', label: 'Crédito' },
]);

export function rotuloFormaPagamento(forma) {
  return FORMAS_PAGAMENTO.find((item) => item.id === forma)?.label || String(forma || '');
}

export function calcularTroco(recebido, total) {
  return dinheiroPdv(Number(recebido) - Number(total));
}

export function atualizarTrocoNoDom(
  container,
  { recebido = '', itens = [], formaPagamento = '' } = {},
) {
  if (!container) {
    return;
  }

  const dinheiro = formaPagamento === 'dinheiro';
  const wrap = container.querySelector('#pdv-recebido-wrap');
  const trocoEl = container.querySelector('#pdv-troco');

  if (wrap) {
    wrap.hidden = !dinheiro;
  }

  if (!trocoEl) {
    return;
  }

  const total = totalLocal(itens);
  const troco = dinheiro && recebido !== '' ? calcularTroco(recebido, total) : null;

  if (troco == null) {
    trocoEl.hidden = true;
    trocoEl.textContent = '';
    return;
  }

  trocoEl.hidden = false;
  trocoEl.textContent = `Troco: ${formatarMoeda(troco)}`;
}

export function podeConfirmarVenda({ itens, formaPagamento, recebido = '' } = {}) {
  if (!Array.isArray(itens) || itens.length === 0 || !formaPagamento) {
    return false;
  }
  if (formaPagamento === 'dinheiro') {
    const total = totalLocal(itens);
    const valor = Number(recebido);
    if (!Number.isFinite(valor) || valor < total) {
      return false;
    }
  }
  return true;
}

export function htmlSeletorFormaPagamento({
  formaPagamento = '',
  recebido = '',
  itens = [],
  erro = '',
} = {}) {
  const total = totalLocal(itens);
  const botoes = FORMAS_PAGAMENTO.map((forma) => {
    const ativo = forma.id === formaPagamento ? ' aria-pressed="true" class="pdv-forma ativo"' : ' aria-pressed="false" class="pdv-forma"';
    return `<button type="button" data-forma="${forma.id}"${ativo}>${forma.label}</button>`;
  }).join('');

  const dinheiro = formaPagamento === 'dinheiro';
  const troco = dinheiro && recebido !== '' ? calcularTroco(recebido, total) : null;
  const confirmarDesabilitado = podeConfirmarVenda({ itens, formaPagamento, recebido }) ? '' : ' disabled';

  return `<section class="pdv-pagamento" id="pdv-pagamento" tabindex="-1">
    <p class="pdv-pagamento-total">Total a pagar: <strong>${formatarMoeda(total)}</strong></p>
    <h2>Forma de pagamento</h2>
    <div class="pdv-formas" role="group" aria-label="Forma de pagamento">${botoes}</div>
    <label id="pdv-recebido-wrap"${dinheiro ? '' : ' hidden'}>
      Valor recebido
      <input type="number" min="0" step="0.01" id="pdv-recebido" value="${escapar(recebido)}" inputmode="decimal">
    </label>
    <p id="pdv-troco"${troco == null ? ' hidden' : ''}>${troco == null ? '' : `Troco: ${formatarMoeda(troco)}`}</p>
    <p id="pdv-erro-venda" class="pdv-erro" role="alert">${escapar(erro)}</p>
    <button type="button" id="btn-confirmar-venda"${confirmarDesabilitado}>Confirmar venda</button>
    <p class="pdv-pagamento-atalhos">Atalhos: 1 Dinheiro · 2 Pix · 3 Débito · Enter confirma</p>
  </section>`;
}
