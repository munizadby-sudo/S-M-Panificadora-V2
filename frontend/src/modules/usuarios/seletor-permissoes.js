import { escapar } from './html.js';
import { PERMISSOES_VALIDAS, ROTULOS_PERMISSAO } from './permissoes.js';

export function htmlSeletorPermissoes(permissoesSelecionadas = []) {
  const set = new Set(Array.isArray(permissoesSelecionadas) ? permissoesSelecionadas : []);
  const itens = PERMISSOES_VALIDAS.map((id) => {
    const marcado = set.has(id) ? ' checked' : '';
    return `<label class="usuarios-permissao-item">
      <input type="checkbox" name="permissoes" value="${escapar(id)}" data-permissao="${escapar(id)}"${marcado}>
      <span class="usuarios-permissao-rotulo">${escapar(ROTULOS_PERMISSAO[id] || id)}</span>
    </label>`;
  }).join('');

  return `<fieldset id="usuarios-bloco-permissoes" class="usuarios-permissoes">
    <legend>Permissões por módulo</legend>
    <div class="usuarios-permissoes-grid">${itens}</div>
  </fieldset>`;
}
