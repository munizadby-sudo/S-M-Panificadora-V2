export function validarFormularioProducao({ produtoId, quantidade, data }) {
  const erros = {};
  const id = Number(produtoId);
  if (!Number.isInteger(id) || id <= 0) {
    erros.produto = 'Selecione um produto.';
  }

  const qtd = Number(quantidade);
  if (!(qtd > 0)) {
    erros.quantidade = 'Quantidade deve ser maior que zero.';
  }

  const dataNormalizada = String(data ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNormalizada)) {
    erros.data = 'Informe uma data válida.';
  }

  if (Object.keys(erros).length > 0) {
    return { ok: false, erros };
  }

  return {
    ok: true,
    valores: {
      produto_id: id,
      quantidade: Math.round(qtd * 1000) / 1000,
      data: dataNormalizada,
    },
  };
}
