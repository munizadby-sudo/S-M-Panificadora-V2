import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';

export function agregarItensPorProduto(itens = []) {
  const mapa = new Map();

  for (const item of itens) {
    const chave = String(item.produtoId ?? item.produto_id ?? item.produto);
    const atual = mapa.get(chave) || {
      produtoId: item.produtoId ?? item.produto_id ?? null,
      produto: item.produtoNome ?? item.produto_nome ?? item.produto ?? `Produto ${chave}`,
      quantidade: 0,
      receita: 0,
    };
    atual.quantidade = Number(atual.quantidade) + Number(item.quantidade || 0);
    atual.receita = dinheiro(atual.receita + Number(item.subtotal || item.receita || 0));
    mapa.set(chave, atual);
  }

  return [...mapa.values()];
}
