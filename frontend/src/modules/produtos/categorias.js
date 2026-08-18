import { escapar } from './html.js';

export function montarSeletorCategoria(select, categorias, { valor = '', incluirTodos = false, rotuloTodos = 'Todas' } = {}) {
  if (!select) {
    return;
  }
  const lista = Array.isArray(categorias) ? categorias : [];
  const primeira = incluirTodos
    ? `<option value="">${escapar(rotuloTodos)}</option>`
    : '<option value="">Selecione</option>';
  select.innerHTML =
    primeira +
    lista
      .map(
        (item) =>
          `<option value="${escapar(item.id)}"${String(item.id) === String(valor) ? ' selected' : ''}>${escapar(item.nome)}</option>`,
      )
      .join('');
  if (valor !== '' && valor != null) {
    select.value = String(valor);
  }
}

export function htmlPainelCategorias(categorias, { podeDesativar = false, erro = '' } = {}) {
  const lista = Array.isArray(categorias) ? categorias : [];
  const itens =
    lista.length === 0
      ? '<li class="estado-vazio">Nenhuma categoria cadastrada.</li>'
      : lista
          .map((item) => {
            const inativa = Number(item.ativo) === 0;
            const badge = inativa ? ' <span class="produtos-inativo">Inativo</span>' : '';
            let acao = '';
            if (podeDesativar && inativa) {
              acao = `<button type="button" data-reativar-categoria="${escapar(item.id)}">Reativar</button>`;
            } else if (podeDesativar) {
              acao = `<button type="button" data-desativar-categoria="${escapar(item.id)}">Desativar</button>`;
            }
            return `<li class="${inativa ? 'produtos-item-inativo' : 'produtos-item-ativo'}"><span>${escapar(item.nome)}${badge}</span>${acao}</li>`;
          })
          .join('');

  return `<section class="produtos-categorias">
      <h2>Categorias</h2>
      <form id="form-nova-categoria" class="produtos-form-categoria">
        <label>Nova categoria <input type="text" id="nome-categoria" name="nome" maxlength="60" required></label>
        <button type="submit">Criar categoria</button>
      </form>
      <p id="categorias-erro" class="produtos-erro" role="alert">${escapar(erro)}</p>
      <ul id="lista-categorias">${itens}</ul>
    </section>`;
}
