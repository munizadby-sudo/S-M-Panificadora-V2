import { escapar, formatarMoeda, formatarQuantidade } from './html.js';
import { htmlOpcoesStatus, rotuloStatus } from './status.js';

export function htmlFiltrosEncomendas({ filtros }) {
  return `<form id="form-filtro-encomendas" class="encomendas-filtros">
    <label>Status
      <select id="encomendas-filtro-status" name="status">
        <option value="">Todos</option>
        ${htmlOpcoesStatus(filtros.status)}
      </select>
    </label>
    <label>Entrega de <input type="date" id="encomendas-data-inicio" name="data_entrega_inicio" value="${escapar(filtros.dataEntregaInicio)}"></label>
    <label>até <input type="date" id="encomendas-data-fim" name="data_entrega_fim" value="${escapar(filtros.dataEntregaFim)}"></label>
    <label>Exibir
      <select id="encomendas-filtro-ativo" name="ativo">
        <option value="1"${filtros.ativo !== '0' && filtros.ativo !== 0 ? ' selected' : ''}>Somente ativas</option>
        <option value="0"${filtros.ativo === '0' || filtros.ativo === 0 ? ' selected' : ''}>Somente canceladas</option>
      </select>
    </label>
    <button type="submit">Filtrar</button>
  </form>`;
}

export function htmlTabelaEncomendas(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhuma encomenda encontrada.</p>';
  }

  const linhas = itens
    .map((item) => {
      const cancelada = Number(item.ativo) === 0;
      const classe = cancelada ? 'encomendas-linha-cancelada' : '';
      const marca = cancelada ? ' <span class="encomendas-marca-cancelada">Cancelada</span>' : '';
      const status = cancelada
        ? escapar(rotuloStatus(item.status))
        : `<select class="encomendas-select-status" data-status-encomenda="${escapar(item.id)}">${htmlOpcoesStatus(item.status)}</select>`;

      const acoes = cancelada
        ? '<td></td>'
        : `<td class="encomendas-acoes">
            <button type="button" data-editar-encomenda="${escapar(item.id)}">Editar</button>
            <button type="button" data-cancelar-encomenda="${escapar(item.id)}">Cancelar</button>
          </td>`;

      return `<tr class="${classe}" data-encomenda-id="${escapar(item.id)}">
        <td>${escapar(item.numero)}</td>
        <td>${escapar(item.cliente)}${marca}</td>
        <td>${escapar(item.data_entrega)}</td>
        <td>${formatarMoeda(item.sinal)}</td>
        <td>${formatarMoeda(item.total)}</td>
        <td>${status}</td>
        ${acoes}
      </tr>`;
    })
    .join('');

  return `<table class="encomendas-tabela">
    <thead>
      <tr>
        <th>Nº</th>
        <th>Cliente</th>
        <th>Entrega</th>
        <th>Sinal</th>
        <th>Total</th>
        <th>Status</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>`;
}
