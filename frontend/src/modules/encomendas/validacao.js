export function validarFormularioEncomenda({ clienteNome, clienteTelefone, dataEntrega, sinal, itens }) {
  const erros = {};

  if (!String(clienteNome ?? '').trim()) {
    erros.clienteNome = 'Nome do contato é obrigatório.';
  }
  if (!String(clienteTelefone ?? '').trim()) {
    erros.clienteTelefone = 'Telefone é obrigatório.';
  }

  const data = String(dataEntrega ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    erros.dataEntrega = 'Informe uma data de entrega válida.';
  }

  const valorSinal = sinal === '' || sinal === undefined || sinal === null ? 0 : Number(sinal);
  if (!(valorSinal >= 0)) {
    erros.sinal = 'Sinal não pode ser negativo.';
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    erros.itens = 'Adicione pelo menos um item.';
  }

  if (Object.keys(erros).length > 0) {
    return { ok: false, erros };
  }

  return {
    ok: true,
    valores: {
      cliente_nome: String(clienteNome).trim(),
      cliente_telefone: String(clienteTelefone).trim(),
      data_entrega: data,
      sinal: Math.round(valorSinal * 100) / 100,
      itens: itens.map((item) => ({ produto_id: item.produtoId, quantidade: item.quantidade })),
    },
  };
}
