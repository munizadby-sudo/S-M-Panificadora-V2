import { escapar, formatarMoeda, formatarQuantidade } from './html.js';

export function quantidadeItem(valor) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export function dinheiroItem(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export function adicionarItem(itens, produto, quantidade) {
  const qtd = quantidadeItem(quantidade);
  if (!(qtd > 0)) {
    return itens;
  }
  const lista = clonarItens(itens);
  const produtoId = Number(produto?.id ?? produto?.produtoId);
  const preco = dinheiroItem(produto?.preco ?? produto?.precoUnitario);
  const existente = lista.find((item) => item.produtoId === produtoId);
  if (existente) {
    existente.quantidade = quantidadeItem(existente.quantidade + qtd);
    existente.subtotal = dinheiroItem(existente.quantidade * existente.precoUnitario);
    return lista;
  }
  lista.push({
    produtoId,
    nome: produto?.nome || '',
    precoUnitario: preco,
    quantidade: qtd,
    subtotal: dinheiroItem(preco * qtd),
  });
  return lista;
}

export function removerItem(itens, produtoId) {
  return clonarItens(itens).filter((item) => item.produtoId !== Number(produtoId));
}

export function totalLocalItens(itens) {
  return dinheiroItem((itens || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0));
}

export function htmlItensEncomenda(itens) {
  const lista = Array.isArray(itens) ? itens : [];
  if (lista.length === 0) {
    return `<p class="estado-vazio" id="encomenda-itens-vazio">Nenhum item adicionado ainda.<span class="estado-vazio-dica">Inclua produtos pela busca acima para montar a encomenda.</span></p>`;
  }

  const linhas = lista
    .map(
      (item) => `<li>
        <span>${escapar(item.nome)} × ${formatarQuantidade(item.quantidade)} — ${formatarMoeda(item.subtotal)}</span>
        <button type="button" data-remover-item-encomenda="${escapar(item.produtoId)}">Remover</button>
      </li>`,
    )
    .join('');

  return `<ul id="encomenda-itens-lista" class="encomendas-itens-lista">${linhas}</ul>
    <p id="encomenda-total-local">Total: <strong>${formatarMoeda(totalLocalItens(lista))}</strong></p>`;
}

function clonarItens(itens) {
  return (itens || []).map((item) => ({ ...item }));
}
