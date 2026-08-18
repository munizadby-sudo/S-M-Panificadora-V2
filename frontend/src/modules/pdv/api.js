import { apiPost, ApiError } from '../../core/api.js';

export async function criarVenda({ forma_pagamento, itens }) {
  return apiPost('/vendas', { forma_pagamento, itens });
}

export function extrairProdutoIdDoErro(mensagem) {
  const texto = String(mensagem || '');
  const match = texto.match(/produto_id\s*=\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function mensagemErroVenda(erro, itens = []) {
  if (erro instanceof ApiError && (erro.codigo === 'CAIXA_FECHADO' || erro.status === 403)) {
    return 'O caixa foi fechado. Recarregando status...';
  }

  const mensagem = erro?.mensagem || erro?.message || '';
  const produtoId = extrairProdutoIdDoErro(mensagem);
  const estoqueInsuficiente =
    erro instanceof ApiError &&
    (erro.codigo === 'ESTOQUE_INSUFICIENTE' || /insuficiente/i.test(mensagem));

  if (estoqueInsuficiente) {
    const item = itens.find((entrada) => Number(entrada.produtoId) === Number(produtoId));
    const nome = item?.nome || (produtoId ? `produto ${produtoId}` : null);
    if (nome) {
      return `Estoque insuficiente para ${nome}`;
    }
    return 'Estoque insuficiente para um item do carrinho.';
  }

  if (erro instanceof ApiError) {
    return mensagem || 'Não foi possível confirmar a venda.';
  }
  return mensagem || 'Não foi possível confirmar a venda.';
}
