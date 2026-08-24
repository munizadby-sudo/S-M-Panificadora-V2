import { escapar, formatarQuantidade } from './html.js';

export function htmlFiltrosProducao({ filtros, produtos }) {
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

  return `<form id="form-filtro-producao" class="producao-filtros">
    <label>De <input type="date" id="producao-data-inicio" name="data_inicio" value="${escapar(filtros.dataInicio)}"></label>
    <label>Até <input type="date" id="producao-data-fim" name="data_fim" value="${escapar(filtros.dataFim)}"></label>
    <label>Produto <select id="producao-filtro-produto" name="produto_id">${opcoesProduto}</select></label>
    <button type="submit">Filtrar</button>
  </form>`;
}

export function htmlTabelaProducao(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhuma produção encontrada.<span class="estado-vazio-dica">Aqui aparece o histórico de produção. Registre a primeira pelo formulário acima.</span></p>';
  }

  const linhas = itens
    .map(
      (item) => `<tr data-producao-id="${escapar(item.id)}">
        <td>${escapar(item.produto)}</td>
        <td>${escapar(item.data)}</td>
        <td>${formatarQuantidade(item.quantidade)}</td>
        <td>${escapar(item.usuario)}</td>
      </tr>`,
    )
    .join('');

  return `<table class="producao-tabela">
    <thead>
      <tr>
        <th>Produto</th>
        <th>Data</th>
        <th>Quantidade</th>
        <th>Responsável</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>`;
}
