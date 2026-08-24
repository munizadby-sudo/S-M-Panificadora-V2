import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';

export function htmlGradeProdutos({ produtos = [], busca = '', erro = '' } = {}) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const cards =
    lista.length === 0
      ? `<p class="estado-vazio">Nenhum produto encontrado.<span class="estado-vazio-dica">Ajuste a busca ou a categoria — aqui aparecem os produtos ativos do catálogo.</span></p>`
      : lista
          .map(
            (item, indice) => `<button type="button" class="pdv-produto" data-adicionar-produto="${escapar(item.id)}" tabindex="${indice === 0 ? 0 : -1}">
              <span class="pdv-produto-nome">${escapar(item.nome)}</span>
              <span class="pdv-produto-preco">${formatarMoeda(item.preco)}</span>
            </button>`,
          )
          .join('');

  return `<section class="pdv-grade" id="pdv-grade">
    <form id="form-filtro-pdv" class="pdv-filtros">
      <label>Busca <input type="search" id="pdv-busca" name="busca" value="${escapar(busca)}" placeholder="Nome do produto"></label>
      <label>Categoria <select id="pdv-categoria" name="categoria_id"></select></label>
    </form>
    <p id="pdv-erro-grade" class="pdv-erro" role="alert">${escapar(erro)}</p>
    <div id="pdv-grade-itens" class="pdv-grade-itens">${cards}</div>
    <details class="pdv-atalhos">
      <summary>Ver atalhos</summary>
      <ul>
        <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> navegam na grade</li>
        <li><kbd>Enter</kbd> adiciona o produto focado ao carrinho</li>
        <li><kbd>Tab</kbd> sai da grade</li>
        <li><kbd>F10</kbd> abre o pagamento (com item no carrinho)</li>
        <li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> escolhem a forma dentro do pagamento</li>
      </ul>
    </details>
  </section>`;
}
