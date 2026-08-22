export function validarCliente({ nome, telefone } = {}) {
  const erros = {};
  const nomeLimpo = String(nome ?? '').trim();
  if (!nomeLimpo) {
    erros.nome = 'Nome é obrigatório.';
  }

  const telefoneLimpo = String(telefone ?? '').trim();
  if (!telefoneLimpo) {
    erros.telefone = 'Telefone é obrigatório.';
  } else if (telefoneLimpo.length > 20) {
    erros.telefone = 'Telefone deve ter no máximo 20 caracteres.';
  } else {
    const digitos = telefoneLimpo.replace(/\D/g, '');
    if (digitos.length < 8) {
      erros.telefone = 'Telefone deve ter pelo menos 8 dígitos.';
    }
  }

  return {
    ok: Object.keys(erros).length === 0,
    erros,
    valores: {
      nome: nomeLimpo,
      telefone: telefoneLimpo,
    },
  };
}
