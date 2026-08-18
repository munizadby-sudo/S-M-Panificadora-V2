import { escapar, formatarQuantidade } from './html.js';

export function htmlTabelaEstoque(itens, { acoes = false } = {}) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhum item de estoque encontrado.</p>';
  }

  const cabecalhoAcoes = acoes ? '<th>Ações</th>' : '';
  const linhas = itens
    .map((item) => {
      const abaixo = item.abaixo_do_minimo === true;
      const classe = abaixo ? 'estoque-linha-abaixo-minimo' : '';
      const alerta = abaixo ? ' <span class="estoque-alerta-minimo">Abaixo do mínimo</span>' : '';
      const celAcoes = acoes
        ? `<td class="estoque-acoes"><button type="button" data-editar-estoque="${escapar(item.produto_id)}">Editar</button></td>`
        : '';
      return `<tr class="${classe}" data-produto-id="${escapar(item.produto_id)}">
        <td>${escapar(item.nome)}${alerta}</td>
        <td>${formatarQuantidade(item.inicial)}</td>
        <td>${formatarQuantidade(item.produzido)}</td>
        <td>${formatarQuantidade(item.vendido)}</td>
        <td class="estoque-disponivel">${formatarQuantidade(item.disponivel)}</td>
        <td>${formatarQuantidade(item.minimo)}</td>
        ${celAcoes}
      </tr>`;
    })
    .join('');

  return `<table class="estoque-tabela">
    <thead>
      <tr>
        <th>Produto</th>
        <th>Inicial</th>
        <th>Produzido</th>
        <th>Vendido</th>
        <th>Disponível</th>
        <th>Mínimo</th>
        ${cabecalhoAcoes}
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>`;
}
