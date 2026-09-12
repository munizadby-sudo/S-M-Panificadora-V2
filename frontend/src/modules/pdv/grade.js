import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';

export function htmlLegendaAtalhos() {
  return `<ul class="pdv-atalhos">
    <li><kbd>F1</kbd> Buscar</li>
    <li><kbd>F2-F8</kbd> Categorias</li>
    <li><kbd>←→↑↓</kbd> Navegar produtos</li>
    <li><kbd>Enter</kbd> Adicionar item</li>
    <li><kbd>Del</kbd> Remover último item</li>
    <li><kbd>Esc</kbd> Fechar modal / Limpar</li>
    <li><kbd>F10</kbd> Finalizar Venda</li>
  </ul>`;
}

export function htmlGradeProdutos({ produtos = [], busca = '', erro = '', avisoLeitor = '' } = {}) {
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
    <p id="pdv-aviso-leitor" class="pdv-erro" role="alert">${escapar(avisoLeitor)}</p>
    <div id="pdv-grade-itens" class="pdv-grade-itens">${cards}</div>
  </section>`;
}
