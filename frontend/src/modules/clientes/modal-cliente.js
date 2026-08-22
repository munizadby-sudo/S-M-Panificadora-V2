import { ApiError } from '../../core/api.js';
import { mensagemErroCliente } from './api.js';
import { escapar } from './html.js';

export function htmlModalCliente({
  cliente = {},
  erro = '',
  errosCampos = {},
  idPrefixo = 'cliente',
  tituloNovo = 'Novo cliente',
  tituloEditar = 'Editar cliente',
  formId = 'form-cliente',
  cancelarId = 'btn-cancelar-cliente',
} = {}) {
  const titulo = cliente.id ? tituloEditar : tituloNovo;
  return `<div class="clientes-modal" id="modal-cliente" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-cliente">
      <form id="${escapar(formId)}" class="clientes-modal-caixa clientes-form-cliente" data-cliente-id="${escapar(cliente.id || '')}">
        <h2 id="titulo-modal-cliente">${titulo}</h2>
        <p id="cliente-erro-modal" class="clientes-erro" role="alert">${escapar(erro)}</p>
        <label>Nome
          <input type="text" id="${escapar(idPrefixo)}-nome" name="nome" maxlength="100" value="${escapar(cliente.nome || '')}" required>
        </label>
        <p class="campo-erro" data-erro-campo="nome">${escapar(errosCampos.nome || '')}</p>
        <label>Telefone
          <input type="text" id="${escapar(idPrefixo)}-telefone" name="telefone" maxlength="20" value="${escapar(cliente.telefone || '')}" required>
        </label>
        <p class="campo-erro" data-erro-campo="telefone">${escapar(errosCampos.telefone || '')}</p>
        <div class="clientes-acoes">
          <button type="submit">Salvar</button>
          <button type="button" id="${escapar(cancelarId)}">Cancelar</button>
        </div>
      </form>
    </div>`;
}

export function aplicarErroSalvarCliente(modal, erro) {
  modal.aberto = true;
  modal.errosCampos = errosCamposDoBackend(erro);
  modal.erro = Object.keys(modal.errosCampos).length ? '' : mensagemErroCliente(erro);
  return modal;
}

export function errosCamposDoBackend(erro) {
  if (!(erro instanceof ApiError) || erro.status !== 400) {
    return {};
  }
  const msg = erro.mensagem || erro.message || '';
  if (/telefone/i.test(msg)) {
    return { telefone: msg };
  }
  if (/nome/i.test(msg)) {
    return { nome: msg };
  }
  return {};
}
