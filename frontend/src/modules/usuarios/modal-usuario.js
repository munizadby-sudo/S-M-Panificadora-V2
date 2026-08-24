import { ApiError } from '../../core/api.js';
import { mensagemErroUsuario } from './api.js';
import { escapar } from './html.js';
import { ROLES } from './permissoes.js';
import { htmlSeletorPermissoes } from './seletor-permissoes.js';

export function htmlModalUsuario({
  usuario = {},
  erro = '',
  errosCampos = {},
} = {}) {
  const editando = Boolean(usuario.id);
  const titulo = editando ? 'Editar usuário' : 'Novo usuário';
  const role = usuario.role || 'operador';
  const blocoPermissoes = role === 'operador' ? htmlSeletorPermissoes(usuario.permissoes || []) : '';
  const opcoesRole = ROLES.map((item) => {
    const sel = item.id === role ? ' selected' : '';
    return `<option value="${escapar(item.id)}"${sel}>${escapar(item.label)}</option>`;
  }).join('');
  const senhaObrigatoria = editando ? '' : ' required';
  const ajudaSenha = editando
    ? '<p class="usuarios-ajuda-senha">Deixe em branco para manter a senha atual.</p>'
    : '';

  return `<div class="usuarios-modal" id="modal-usuario" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-usuario">
    <form id="form-usuario" class="usuarios-modal-caixa usuarios-form" data-usuario-id="${escapar(usuario.id || '')}">
      <header class="usuarios-modal-cabecalho">
        <h2 id="titulo-modal-usuario">${titulo}</h2>
      </header>
      <div class="usuarios-modal-corpo">
        <p id="usuario-erro-modal" class="usuarios-erro" role="alert">${escapar(erro)}</p>
        <label>Nome
          <input type="text" id="usuario-nome" name="nome" maxlength="100" value="${escapar(usuario.nome || '')}" required>
        </label>
        <p class="campo-erro" data-erro-campo="nome">${escapar(errosCampos.nome || '')}</p>
        <label>Username
          <input type="text" id="usuario-username" name="username" maxlength="50" value="${escapar(usuario.username || '')}" required autocomplete="username">
        </label>
        <p class="campo-erro" data-erro-campo="username">${escapar(errosCampos.username || '')}</p>
        <label>Senha
          <input type="password" id="usuario-senha" name="senha" autocomplete="new-password" placeholder=" "${senhaObrigatoria}>
        </label>
        ${ajudaSenha}
        <p class="campo-erro" data-erro-campo="senha">${escapar(errosCampos.senha || '')}</p>
        <label>Papel
          <select id="usuario-role" name="role" required>${opcoesRole}</select>
        </label>
        <p class="campo-erro" data-erro-campo="role">${escapar(errosCampos.role || '')}</p>
        ${blocoPermissoes}
      </div>
      <div class="usuarios-form-acoes">
        <button type="button" id="btn-cancelar-usuario" class="usuarios-btn-secundario">Cancelar</button>
        <button type="submit" class="usuarios-btn-primario">Salvar</button>
      </div>
    </form>
  </div>`;
}

export function aplicarErroSalvarUsuario(modal, erro) {
  modal.aberto = true;
  modal.errosCampos = errosCamposDoBackend(erro);
  modal.erro = Object.keys(modal.errosCampos).length ? '' : mensagemErroUsuario(erro);
  return modal;
}

export function errosCamposDoBackend(erro) {
  if (!(erro instanceof ApiError)) {
    return {};
  }
  if (erro.status === 409) {
    return { username: mensagemErroUsuario(erro) };
  }
  const msg = erro.mensagem || erro.message || '';
  if (/senha/i.test(msg)) {
    return { senha: msg };
  }
  if (/username|usuário/i.test(msg)) {
    return { username: msg };
  }
  if (/nome/i.test(msg)) {
    return { nome: msg };
  }
  return {};
}

export function ligarFeedbackSenha(container) {
  const campo = container?.querySelector('#usuario-senha');
  if (!campo) {
    return;
  }
  const sincronizar = () => {
    campo.classList.toggle('campo-preenchido', Boolean(campo.value));
  };
  campo.addEventListener('input', sincronizar);
  sincronizar();
}
