import { escapar, formatarMoeda } from './html.js';

export function htmlSeletorProduto({ busca, produto, resultados, erro }) {
  const lista =
    Array.isArray(resultados) && resultados.length > 0 && !produto
      ? `<ul class="perdas-resultados-produto" id="perda-resultados-produto">
          ${resultados
            .map(
              (item) =>
                `<li><button type="button" class="perdas-item-produto" data-produto-id="${escapar(item.id)}" data-produto-nome="${escapar(item.nome)}" data-produto-custo="${escapar(item.custo)}">${escapar(item.nome)} — ${formatarMoeda(item.custo)}</button></li>`,
            )
            .join('')}
        </ul>`
      : '';

  const selecionado = produto
    ? `<p class="perdas-produto-selecionado">Selecionado: <strong>${escapar(produto.nome)}</strong> (custo unitário ${formatarMoeda(produto.custo)})</p>`
    : '';

  return `<div class="perdas-seletor-produto">
    <label>Produto
      <input type="search" id="perda-busca-produto" name="busca_produto" value="${escapar(busca)}" placeholder="Buscar produto..." autocomplete="off"${produto ? ' disabled' : ''}>
      <input type="hidden" id="perda-produto-id" name="produto_id" value="${escapar(produto?.id ?? '')}">
    </label>
    <p class="campo-erro" id="perda-erro-produto">${escapar(erro || '')}</p>
    ${selecionado}
    ${lista}
    ${produto ? '<button type="button" id="perda-limpar-produto">Trocar produto</button>' : ''}
  </div>`;
}
