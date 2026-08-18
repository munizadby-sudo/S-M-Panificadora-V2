import { formatarMoeda } from '../../core/utils.js';
import { escapar } from '../produtos/html.js';

export function quantidadePdv(valor) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export function dinheiroPdv(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export function adicionarAoCarrinho(itens, produto) {
  const lista = clonarItens(itens);
  const produtoId = Number(produto?.id ?? produto?.produtoId);
  const preco = dinheiroPdv(produto?.preco ?? produto?.precoUnitario);
  const existente = lista.find((item) => item.produtoId === produtoId);
  if (existente) {
    existente.quantidade = quantidadePdv(existente.quantidade + 1);
    existente.subtotal = dinheiroPdv(existente.quantidade * existente.precoUnitario);
    return lista;
  }
  lista.push({
    produtoId,
    nome: produto?.nome || '',
    precoUnitario: preco,
    quantidade: 1,
    subtotal: preco,
  });
  return lista;
}

export function removerDoCarrinho(itens, produtoId) {
  return clonarItens(itens).filter((item) => item.produtoId !== Number(produtoId));
}

export function removerUltimoDoCarrinho(itens) {
  const lista = clonarItens(itens);
  const ultimo = lista[lista.length - 1];
  if (!ultimo) {
    return lista;
  }
  if (ultimo.quantidade > 1) {
    ultimo.quantidade = quantidadePdv(ultimo.quantidade - 1);
    ultimo.subtotal = dinheiroPdv(ultimo.quantidade * ultimo.precoUnitario);
    return lista;
  }
  lista.pop();
  return lista;
}

export function limparCarrinho() {
  return [];
}

export function totalLocal(itens) {
  return dinheiroPdv((itens || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0));
}

export function htmlCarrinho(itens) {
  const lista = Array.isArray(itens) ? itens : [];
  if (lista.length === 0) {
    return `<aside class="pdv-carrinho" id="pdv-carrinho">
      <h2>Carrinho</h2>
      <p class="estado-vazio">Carrinho vazio.</p>
      <p id="pdv-total-local">Total: ${formatarMoeda(0)}</p>
    </aside>`;
  }

  const linhas = lista
    .map(
      (item) => `<li>
        <span>${escapar(item.nome)} × ${escapar(item.quantidade)} — ${formatarMoeda(item.subtotal)}</span>
        <button type="button" data-remover-item="${escapar(item.produtoId)}">Remover</button>
      </li>`,
    )
    .join('');

  return `<aside class="pdv-carrinho" id="pdv-carrinho">
    <h2>Carrinho</h2>
    <ul id="pdv-carrinho-itens">${linhas}</ul>
    <p id="pdv-total-local">Total: ${formatarMoeda(totalLocal(lista))}</p>
    <div class="pdv-carrinho-acoes">
      <button type="button" id="btn-remover-ultimo">Remover último</button>
      <button type="button" id="btn-limpar-carrinho">Limpar</button>
    </div>
  </aside>`;
}

function clonarItens(itens) {
  return (itens || []).map((item) => ({ ...item }));
}
