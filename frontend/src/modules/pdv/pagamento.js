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
  if (forma === 'misto') {
    return 'Misto';
  }
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

/** Segunda forma de um pagamento dividido (Passo 10) — total menos o valor já atribuído à 1ª forma. */
export function calcularValorRestante(total, valor1) {
  return dinheiroPdv(Number(total) - Number(valor1));
}

/** Atualiza só o texto do restante e a dica de valor inválido, sem re-renderizar o painel (mantém o foco do input). */
export function atualizarRestanteNoDom(container, { total, formaPagamento2 = '', valorPagamento1 = '' } = {}) {
  if (!container) {
    return;
  }
  const valor1 = Number(valorPagamento1);
  const valor1Ok = valorPagamento1 !== '' && Number.isFinite(valor1) && valor1 > 0 && valor1 < Number(total);
  const restante = valor1Ok ? calcularValorRestante(total, valor1) : null;

  const dicaEl = container.querySelector('.pdv-divisao-pagamento .pdv-recebido-dica');
  if (dicaEl) {
    dicaEl.hidden = valorPagamento1 === '' || valor1Ok;
  }

  const restanteEl = container.querySelector('#pdv-restante-forma2');
  if (restanteEl) {
    const mostrar = restante != null && formaPagamento2;
    restanteEl.hidden = !mostrar;
    restanteEl.textContent = mostrar
      ? `Restante em ${rotuloFormaPagamento(formaPagamento2)}: ${formatarMoeda(restante)}`
      : '';
  }
}

export function podeConfirmarVenda({
  itens,
  formaPagamento,
  recebido = '',
  dividir = false,
  formaPagamento2 = '',
  valorPagamento1 = '',
} = {}) {
  if (!Array.isArray(itens) || itens.length === 0 || !formaPagamento) {
    return false;
  }
  const total = totalLocal(itens);

  if (dividir) {
    if (!formaPagamento2 || formaPagamento2 === formaPagamento) {
      return false;
    }
    const valor1 = Number(valorPagamento1);
    if (!Number.isFinite(valor1) || valor1 <= 0 || valor1 >= total) {
      return false;
    }
    return true;
  }

  if (formaPagamento === 'dinheiro') {
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
  dividir = false,
  formaPagamento2 = '',
  valorPagamento1 = '',
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

  const dinheiro = !dividir && formaPagamento === 'dinheiro';
  const totalNum = total;
  const valorRecebido = Number(recebido);
  const recebidoOk = recebido !== '' && Number.isFinite(valorRecebido) && valorRecebido >= totalNum;
  const troco = dinheiro && recebidoOk ? calcularTroco(recebido, totalNum) : null;
  const dicaRecebido = !dinheiro || recebidoOk
    ? ''
    : recebido === '' || !Number.isFinite(valorRecebido)
      ? 'Informe o valor recebido'
      : 'Valor insuficiente';
  const confirmarDesabilitado = podeConfirmarVenda({
    itens,
    formaPagamento,
    recebido,
    dividir,
    formaPagamento2,
    valorPagamento1,
  })
    ? ''
    : ' disabled';

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
    <label class="pdv-dividir-toggle">
      <input type="checkbox" id="pdv-dividir-pagamento"${dividir ? ' checked' : ''}>
      Dividir em duas formas
    </label>
    ${htmlDivisaoPagamento({ dividir, formaPagamento, formaPagamento2, valorPagamento1, total: totalNum })}
    <p id="pdv-erro-venda" class="pdv-erro" role="alert">${escapar(erro)}</p>
    <div class="pdv-pagamento-acoes">
      <button type="button" id="btn-cancelar-pagamento">Cancelar <span class="atalho">Esc</span></button>
      <button type="button" id="btn-confirmar-venda"${confirmarDesabilitado}>Confirmar venda <span class="atalho">Enter</span></button>
    </div>
  </section>`;
}

function htmlDivisaoPagamento({ dividir, formaPagamento, formaPagamento2, valorPagamento1, total }) {
  if (!dividir) {
    return '';
  }
  if (!formaPagamento) {
    return '<p class="pdv-recebido-dica">Escolha a 1ª forma acima.</p>';
  }

  const valor1 = Number(valorPagamento1);
  const valor1Ok = valorPagamento1 !== '' && Number.isFinite(valor1) && valor1 > 0 && valor1 < total;
  const restante = valor1Ok ? calcularValorRestante(total, valor1) : null;

  const botoesForma2 = FORMAS_PAGAMENTO.filter((forma) => forma.id !== formaPagamento)
    .map((forma) => {
      const ativo = forma.id === formaPagamento2;
      const classe = ativo ? 'pdv-forma ativo' : 'pdv-forma';
      return `<button type="button" data-forma2="${forma.id}" class="${classe}" aria-pressed="${ativo}">
        <span class="pdv-forma-icone" aria-hidden="true">${forma.icone}</span>
        ${forma.label}
      </button>`;
    })
    .join('');

  return `<div class="pdv-recebido-painel pdv-divisao-pagamento">
    <label for="pdv-valor-forma1">Valor em ${escapar(rotuloFormaPagamento(formaPagamento))} (R$)</label>
    <input type="number" min="0" step="0.01" id="pdv-valor-forma1" value="${escapar(valorPagamento1)}" inputmode="decimal" placeholder="0,00">
    <p class="pdv-recebido-dica"${valorPagamento1 === '' || valor1Ok ? ' hidden' : ''}>Valor inválido</p>
    <div class="pdv-formas pdv-formas-secundarias" role="group" aria-label="2ª forma de pagamento">${botoesForma2}</div>
    <p id="pdv-restante-forma2"${restante == null || !formaPagamento2 ? ' hidden' : ''}>${
      restante == null || !formaPagamento2
        ? ''
        : `Restante em ${escapar(rotuloFormaPagamento(formaPagamento2))}: ${formatarMoeda(restante)}`
    }</p>
  </div>`;
}
