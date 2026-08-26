import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';
import { dinheiroPdv, totalLocal } from './carrinho.js';

/** Atalhos 1–4 no painel de pagamento (Passo 6). */
export const ATALHOS_FORMA_PAGAMENTO = Object.freeze(['dinheiro', 'pix', 'cartao', 'credito']);

export const FORMAS_PAGAMENTO = Object.freeze([
  { id: 'dinheiro', label: 'Dinheiro', icone: '💵' },
  { id: 'pix', label: 'Pix', icone: '📱' },
  { id: 'cartao', label: 'Débito', icone: '💳' },
  { id: 'credito', label: 'Crédito', icone: '💳' },
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
  const dicaEl = container.querySelector('#pdv-recebido-dica');

  if (wrap) {
    wrap.hidden = !dinheiro;
  }

  const total = totalLocal(itens);
  const valor = Number(recebido);
  const recebidoOk = recebido !== '' && Number.isFinite(valor) && valor >= total;

  if (dicaEl) {
    dicaEl.hidden = !dinheiro || recebidoOk;
    dicaEl.textContent = !dinheiro || recebidoOk
      ? ''
      : recebido === '' || !Number.isFinite(valor)
        ? 'Informe o valor recebido'
        : 'Valor insuficiente';
  }

  if (!trocoEl) {
    return;
  }

  const troco = dinheiro && recebidoOk ? calcularTroco(recebido, total) : null;

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
  const botoes = FORMAS_PAGAMENTO.map((forma, indice) => {
    const ativo = forma.id === formaPagamento;
    const classe = ativo ? 'pdv-forma ativo' : 'pdv-forma';
    return `<button type="button" data-forma="${forma.id}" class="${classe}" aria-pressed="${ativo}">
      <span class="pdv-forma-tecla">${indice + 1}</span>
      <span class="pdv-forma-icone" aria-hidden="true">${forma.icone}</span>
      ${forma.label}
    </button>`;
  }).join('');

  const dinheiro = formaPagamento === 'dinheiro';
  const totalNum = total;
  const valorRecebido = Number(recebido);
  const recebidoOk = recebido !== '' && Number.isFinite(valorRecebido) && valorRecebido >= totalNum;
  const troco = dinheiro && recebidoOk ? calcularTroco(recebido, totalNum) : null;
  const dicaRecebido = !dinheiro || recebidoOk
    ? ''
    : recebido === '' || !Number.isFinite(valorRecebido)
      ? 'Informe o valor recebido'
      : 'Valor insuficiente';
  const confirmarDesabilitado = podeConfirmarVenda({ itens, formaPagamento, recebido }) ? '' : ' disabled';

  return `<section class="pdv-pagamento" id="pdv-pagamento" tabindex="-1">
    <div class="pdv-pagamento-total">
      <span>Total a pagar</span>
      <strong>${formatarMoeda(total)}</strong>
    </div>
    <div class="pdv-formas" role="group" aria-label="Forma de pagamento">${botoes}</div>
    <div id="pdv-recebido-wrap" class="pdv-recebido-painel"${dinheiro ? '' : ' hidden'}>
      <label for="pdv-recebido">Valor recebido (R$)</label>
      <input type="number" min="0" step="0.01" id="pdv-recebido" value="${escapar(recebido)}" inputmode="decimal" placeholder="0,00">
      <p id="pdv-troco"${troco == null ? ' hidden' : ''}>${troco == null ? '' : `Troco: ${formatarMoeda(troco)}`}</p>
      <p id="pdv-recebido-dica" class="pdv-recebido-dica"${dicaRecebido ? '' : ' hidden'}>${escapar(dicaRecebido)}</p>
    </div>
    <p id="pdv-erro-venda" class="pdv-erro" role="alert">${escapar(erro)}</p>
    <div class="pdv-pagamento-acoes">
      <button type="button" id="btn-cancelar-pagamento">Cancelar <span class="atalho">Esc</span></button>
      <button type="button" id="btn-confirmar-venda"${confirmarDesabilitado}>Confirmar venda <span class="atalho">Enter</span></button>
    </div>
  </section>`;
}
