import { escapar } from './html.js';

export function htmlTabelaClientes(clientes, { acoes = false } = {}) {
  if (!Array.isArray(clientes) || clientes.length === 0) {
    return '<p class="estado-vazio">Nenhum cliente encontrado.<span class="estado-vazio-dica">Aqui ficam os clientes cadastrados. Use Novo cliente para incluir o primeiro.</span></p>';
  }

  const cabecalhoAcoes = acoes ? '<th>Ações</th>' : '';
  const linhas = clientes
    .map((item) => {
      const inativo = Number(item.ativo) === 0;
      const badge = inativo ? ' <span class="clientes-inativo">Inativo</span>' : '';
      const botoes = [];
      if (acoes && !inativo) {
        botoes.push(`<button type="button" data-editar-cliente="${escapar(item.id)}">Editar</button>`);
        botoes.push(`<button type="button" data-desativar-cliente="${escapar(item.id)}">Desativar</button>`);
      }
      if (acoes && inativo) {
        botoes.push(`<button type="button" data-reativar-cliente="${escapar(item.id)}">Reativar</button>`);
      }
      const celAcoes = acoes ? `<td class="clientes-acoes">${botoes.join(' ')}</td>` : '';
      return `<tr class="${inativo ? 'clientes-linha-inativa' : 'clientes-linha-ativa'}">
        <td>${escapar(item.nome)}${badge}</td>
        <td>${escapar(item.telefone)}</td>
        ${celAcoes}
      </tr>`;
    })
    .join('');

  return `<table class="clientes-tabela">
    <thead><tr><th>Nome</th><th>Telefone</th>${cabecalhoAcoes}</tr></thead>
    <tbody>${linhas}</tbody>
  </table>`;
}
