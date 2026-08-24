export function validarUsuario({ nome, username, senha, role, editando = false } = {}) {
  const erros = {};
  const nomeLimpo = String(nome ?? '').trim();
  const usernameLimpo = String(username ?? '').trim();
  const senhaInformada = String(senha ?? '');

  if (!nomeLimpo) {
    erros.nome = 'Informe o nome.';
  }
  if (!usernameLimpo) {
    erros.username = 'Informe o username.';
  }
  if (!editando && !senhaInformada) {
    erros.senha = 'Informe a senha.';
  }
  if (!role) {
    erros.role = 'Selecione o papel.';
  }

  return {
    ok: Object.keys(erros).length === 0,
    erros,
    valores: {
      nome: nomeLimpo,
      username: usernameLimpo,
      senha: senhaInformada,
      role,
    },
  };
}
