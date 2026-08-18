import { formatarMoeda } from '../../core/utils.js';
import { escapar } from './html.js';

export function nomeDaCategoria(produto, categorias = []) {
  if (produto?.categoria_nome) {
    return produto.categoria_nome;
  }
  const id = produto?.categoria_id;
  const encontrada = (categorias || []).find((item) => String(item.id) === String(id));
  return encontrada?.nome || (id == null ? '' : String(id));
}

export function htmlTabelaProdutos(produtos, categorias = [], { acoes = false, podeDesativar = false } = {}) {
  if (!Array.isArray(produtos) || produtos.length === 0) {
    return '<p class="estado-vazio">Nenhum produto encontrado.</p>';
  }

  const mostrarAcoes = acoes || podeDesativar;
  const cabecalhoAcoes = mostrarAcoes ? '<th>Ações</th>' : '';
  const linhas = produtos
    .map((item) => {
      const inativo = Number(item.ativo) === 0;
      const badge = inativo ? ' <span class="produtos-inativo">Inativo</span>' : '';
      const botoes = [];
      if (acoes && !inativo) {
        botoes.push(`<button type="button" data-editar-produto="${escapar(item.id)}">Editar</button>`);
      }
      if (podeDesativar && !inativo) {
        botoes.push(`<button type="button" data-desativar-produto="${escapar(item.id)}">Desativar</button>`);
      }
      if (podeDesativar && inativo) {
        botoes.push(`<button type="button" data-reativar-produto="${escapar(item.id)}">Reativar</button>`);
      }
      const celAcoes = mostrarAcoes ? `<td class="produtos-acoes">${botoes.join(' ')}</td>` : '';
      return `<tr class="${inativo ? 'produtos-linha-inativa' : 'produtos-linha-ativa'}">
        <td>${escapar(item.icone || '')}</td>
        <td>${escapar(item.nome)}${badge}</td>
        <td>${escapar(nomeDaCategoria(item, categorias))}</td>
        <td>${formatarMoeda(item.preco)}</td>
        <td>${formatarMoeda(item.custo)}</td>
        ${celAcoes}
      </tr>`;
    })
    .join('');

  return `<table class="produtos-tabela">
    <thead><tr><th>Ícone</th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Custo</th>${cabecalhoAcoes}</tr></thead>
    <tbody>${linhas}</tbody>
  </table>`;
}
