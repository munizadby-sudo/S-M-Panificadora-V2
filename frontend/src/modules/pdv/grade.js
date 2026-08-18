import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';

export function htmlGradeProdutos({ produtos = [], busca = '', erro = '' } = {}) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const cards =
    lista.length === 0
      ? '<p class="estado-vazio">Nenhum produto encontrado.</p>'
      : lista
          .map(
            (item) => `<button type="button" class="pdv-produto" data-adicionar-produto="${escapar(item.id)}">
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
  </section>`;
}
