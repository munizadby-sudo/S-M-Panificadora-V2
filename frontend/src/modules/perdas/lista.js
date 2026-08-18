import { escapar, formatarMoeda, formatarQuantidade } from './html.js';
import { htmlOpcoesMotivo, rotuloMotivo } from './motivos.js';

export function htmlFiltrosPerdas({ filtros, produtos, ehAdmin }) {
  const opcoesProduto = ['<option value="">Todos</option>']
    .concat(
      (produtos || []).map(
        (produto) =>
          `<option value="${escapar(produto.id)}"${
            String(filtros.produtoId) === String(produto.id) ? ' selected' : ''
          }>${escapar(produto.nome)}</option>`,
      ),
    )
    .join('');

  return `<form id="form-filtro-perdas" class="perdas-filtros">
    <label>De <input type="date" id="perdas-data-inicio" name="data_inicio" value="${escapar(filtros.dataInicio)}"></label>
    <label>Até <input type="date" id="perdas-data-fim" name="data_fim" value="${escapar(filtros.dataFim)}"></label>
    <label>Produto <select id="perdas-filtro-produto" name="produto_id">${opcoesProduto}</select></label>
    <label>Motivo <select id="perdas-filtro-motivo" name="motivo">
      <option value="">Todos</option>
      ${htmlOpcoesMotivo(filtros.motivo)}
    </select></label>
    ${
      ehAdmin
        ? `<label>Exibir
      <select id="perdas-filtro-ativo" name="ativo">
        <option value="1"${filtros.ativo !== '0' && filtros.ativo !== 0 ? ' selected' : ''}>Somente ativas</option>
        <option value="0"${filtros.ativo === '0' || filtros.ativo === 0 ? ' selected' : ''}>Somente estornadas</option>
      </select>
    </label>`
        : ''
    }
    <button type="submit">Filtrar</button>
  </form>`;
}

export function htmlTabelaPerdas(itens, { ehAdmin = false } = {}) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhuma perda encontrada.</p>';
  }

  const cabecalhoEstorno = ehAdmin ? '<th>Ações</th>' : '';
  const linhas = itens
    .map((item) => {
      const estornada = Number(item.ativo) === 0;
      const classe = estornada ? 'perdas-linha-estornada' : '';
      const rotuloEstorno = estornada ? ' <span class="perdas-marca-estornada">Estornada</span>' : '';
      const acoes =
        ehAdmin && !estornada
          ? `<td class="perdas-acoes"><button type="button" data-estornar-perda="${escapar(item.id)}">Estornar</button></td>`
          : ehAdmin
            ? '<td></td>'
            : '';
      return `<tr class="${classe}" data-perda-id="${escapar(item.id)}">
        <td>${escapar(item.produto)}${rotuloEstorno}</td>
        <td>${escapar(item.data)}</td>
        <td>${formatarQuantidade(item.quantidade)}</td>
        <td>${escapar(rotuloMotivo(item.motivo))}</td>
        <td>${formatarMoeda(item.custo_calculado)}</td>
        <td>${escapar(item.usuario)}</td>
        ${acoes}
      </tr>`;
    })
    .join('');

  return `<table class="perdas-tabela">
    <thead>
      <tr>
        <th>Produto</th>
        <th>Data</th>
        <th>Quantidade</th>
        <th>Motivo</th>
        <th>Custo</th>
        <th>Responsável</th>
        ${cabecalhoEstorno}
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>`;
}
