import { escapar } from './html.js';

function rotuloRole(role) {
  if (role === 'admin') {
    return 'Administrador';
  }
  if (role === 'operador') {
    return 'Operador';
  }
  return String(role || '');
}

export function htmlTabelaUsuarios(usuarios, { usuarioLogadoId = null } = {}) {
  if (!Array.isArray(usuarios) || usuarios.length === 0) {
    return '<p class="estado-vazio">Nenhum usuário encontrado.<span class="estado-vazio-dica">Cadastre operadores e administradores que acessam o sistema.</span></p>';
  }

  const linhas = usuarios
    .map((item) => {
      const inativo = Number(item.ativo) === 0;
      const badge = inativo ? ' <span class="usuarios-inativo">Inativo</span>' : '';
      const propriaConta = usuarioLogadoId != null && Number(item.id) === Number(usuarioLogadoId);
      const botoes = [];
      if (!inativo) {
        botoes.push(`<button type="button" data-editar-usuario="${escapar(item.id)}">Editar</button>`);
        const desabilitado = propriaConta ? ' disabled' : '';
        botoes.push(
          `<button type="button" data-desativar-usuario="${escapar(item.id)}"${desabilitado}>Desativar</button>`,
        );
      }
      return `<tr class="${inativo ? 'usuarios-linha-inativa' : ''}">
        <td>${escapar(item.nome)}${badge}</td>
        <td>${escapar(item.username)}</td>
        <td>${escapar(rotuloRole(item.role))}</td>
        <td>${inativo ? 'Inativo' : 'Ativo'}</td>
        <td class="usuarios-acoes">${botoes.join(' ')}</td>
      </tr>`;
    })
    .join('');

  return `<table class="usuarios-tabela">
    <thead><tr><th>Nome</th><th>Username</th><th>Papel</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>`;
}
