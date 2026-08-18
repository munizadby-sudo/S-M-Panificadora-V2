export function parseDecimal(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return NaN;
  }
  return Number(String(valor).trim().replace(',', '.'));
}

export function validarProduto({ nome, categoria_id, preco, custo } = {}) {
  const erros = {};
  const nomeLimpo = String(nome ?? '').trim();
  if (!nomeLimpo) {
    erros.nome = 'Nome é obrigatório.';
  }

  const categoriaId = Number(categoria_id);
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    erros.categoria_id = 'Categoria é obrigatória.';
  }

  const precoNum = parseDecimal(preco);
  if (!(precoNum > 0)) {
    erros.preco = 'Preço deve ser maior que zero.';
  }

  const custoVazio = custo === undefined || custo === null || String(custo).trim() === '';
  const custoNum = custoVazio ? 0 : parseDecimal(custo);
  if (Number.isNaN(custoNum) || custoNum < 0) {
    erros.custo = 'Custo não pode ser negativo.';
  }

  return {
    ok: Object.keys(erros).length === 0,
    erros,
    valores: {
      nome: nomeLimpo,
      categoria_id: categoriaId,
      preco: precoNum,
      custo: custoNum,
    },
  };
}
