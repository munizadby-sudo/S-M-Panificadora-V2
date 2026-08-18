import { escapar, formatarMoeda, rotuloOrigem, rotuloTipo } from './html.js';

export function htmlContextoTurno({ turnoAberto, turnoId, turnoPeriodo, modoConsulta }) {
  if (turnoAberto && turnoId) {
    return `<p class="fluxo-contexto-turno" role="status">
      Exibindo lançamentos do turno aberto (<strong>${escapar(turnoPeriodo || '—')}</strong>, id ${escapar(turnoId)}).
    </p>`;
  }
  if (modoConsulta === 'periodo') {
    return `<p class="fluxo-contexto-turno" role="status">
      Sem turno aberto — consulta por período (filtros abaixo).
    </p>`;
  }
  return '';
}

export function htmlFiltrosFluxo({ filtros, turnoAberto }) {
  const filtrosPeriodo = turnoAberto
    ? ''
    : `<label>De <input type="date" id="fluxo-data-inicio" name="data_inicio" value="${escapar(filtros.dataInicio)}"></label>
       <label>Até <input type="date" id="fluxo-data-fim" name="data_fim" value="${escapar(filtros.dataFim)}"></label>`;

  return `<form id="form-filtro-fluxo" class="fluxo-filtros">
    ${filtrosPeriodo}
    <label>Categoria
      <select id="fluxo-filtro-categoria" name="categoria">
        <option value="">Todas</option>
        <option value="vendas"${filtros.categoria === 'vendas' ? ' selected' : ''}>Vendas</option>
        <option value="estorno"${filtros.categoria === 'estorno' ? ' selected' : ''}>Estorno</option>
        <option value="sangria"${filtros.categoria === 'sangria' ? ' selected' : ''}>Sangria</option>
        <option value="suprimento"${filtros.categoria === 'suprimento' ? ' selected' : ''}>Suprimento</option>
      </select>
    </label>
    <label>Tipo
      <select id="fluxo-filtro-tipo" name="tipo">
        <option value="">Todos</option>
        <option value="entrada"${filtros.tipo === 'entrada' ? ' selected' : ''}>Entrada</option>
        <option value="saida"${filtros.tipo === 'saida' ? ' selected' : ''}>Saída</option>
      </select>
    </label>
    <label>Origem
      <select id="fluxo-filtro-gerado-auto" name="gerado_auto">
        <option value="">Todas</option>
        <option value="0"${filtros.geradoAuto === '0' ? ' selected' : ''}>Manual</option>
        <option value="1"${filtros.geradoAuto === '1' ? ' selected' : ''}>Automático</option>
      </select>
    </label>
    <button type="submit">Filtrar</button>
  </form>`;
}

export function htmlTabelaFluxo(itens, { ehAdmin = false } = {}) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhum lançamento encontrado.</p>';
  }

  const linhas = itens
    .map((item) => {
      const manual = Number(item.gerado_auto) !== 1;
      const podeExcluir = manual || ehAdmin;
      const acoes = podeExcluir
        ? `<td class="fluxo-acoes"><button type="button" data-excluir-fluxo="${escapar(item.id)}">Excluir</button></td>`
        : '<td></td>';

      return `<tr data-fluxo-id="${escapar(item.id)}">
        <td>${escapar(rotuloTipo(item.tipo))}</td>
        <td>${escapar(item.descricao)}</td>
        <td>${escapar(item.categoria)}</td>
        <td>${escapar(item.forma)}</td>
        <td>${formatarMoeda(item.valor)}</td>
        <td>${escapar(rotuloOrigem(item.gerado_auto))}</td>
        <td>${escapar(item.usuario || '—')}</td>
        ${acoes}
      </tr>`;
    })
    .join('');

  return `<table class="fluxo-tabela">
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Descrição</th>
        <th>Categoria</th>
        <th>Forma</th>
        <th>Valor</th>
        <th>Origem</th>
        <th>Usuário</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>`;
}
