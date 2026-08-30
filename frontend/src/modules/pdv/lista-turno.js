import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';
import { rotuloFormaPagamento } from './pagamento.js';

export function formatarHoraVenda(criadoEm) {
  if (!criadoEm) {
    return '—';
  }
  const data = criadoEm instanceof Date ? criadoEm : new Date(criadoEm);
  if (Number.isNaN(data.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(data);
}

export function htmlListaVendasTurno({ vendas = [], ehAdmin = false, erro = '' } = {}) {
  const linhas = vendas.length
    ? vendas.map((venda) => htmlLinhaVendaTurno(venda, ehAdmin)).join('')
    : '<li class="pdv-venda-turno-vazia">Nenhuma venda neste turno.</li>';

  return `<section id="pdv-vendas-turno" class="pdv-vendas-turno" aria-label="Vendas deste turno">
    <h2>Vendas deste turno</h2>
    <p class="pdv-erro" role="alert">${escapar(erro)}</p>
    <ul>${linhas}</ul>
  </section>`;
}

function htmlLinhaVendaTurno(venda, ehAdmin) {
  const id = Number(venda?.id);
  const numero = venda?.numero ?? id;
  const cancelada = venda?.status === 'cancelada';
  const botao =
    ehAdmin && !cancelada && Number.isFinite(id)
      ? `<button type="button" class="pdv-btn-estornar" data-estornar-venda="${escapar(id)}">Estornar</button>`
      : '';
  const status = cancelada ? '<span class="pdv-venda-estornada">Estornada</span>' : '';

  return `<li class="pdv-venda-turno-item${cancelada ? ' is-cancelada' : ''}">
    <div class="pdv-venda-turno-dados">
      <strong>Nº ${escapar(numero)}</strong>
      <span>${escapar(formatarHoraVenda(venda?.criado_em))}</span>
      <span>${formatarMoeda(venda?.total)}</span>
      <span>${escapar(rotuloFormaPagamento(venda?.forma_pagamento))}</span>
      ${status}
    </div>
    ${botao}
  </li>`;
}
