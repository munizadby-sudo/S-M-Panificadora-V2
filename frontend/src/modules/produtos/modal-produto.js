import { ApiError } from '../../core/api.js';
import { mensagemErroProduto } from './api.js';
import { escapar } from './html.js';

export function htmlModalProduto({ produto = {}, erro = '', errosCampos = {} } = {}) {
  const titulo = produto.id ? 'Editar produto' : 'Novo produto';
  return `<div class="produtos-modal" id="modal-produto" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-produto">
      <form id="form-produto" class="produtos-modal-caixa produtos-form-produto" data-produto-id="${escapar(produto.id || '')}">
        <h2 id="titulo-modal-produto">${titulo}</h2>
        <p id="produto-erro-modal" class="produtos-erro" role="alert">${escapar(erro)}</p>
        <label>Nome
          <input type="text" id="produto-nome" name="nome" maxlength="100" value="${escapar(produto.nome || '')}" required>
        </label>
        <p class="campo-erro" data-erro-campo="nome">${escapar(errosCampos.nome || '')}</p>
        <label>Categoria
          <select id="produto-categoria" name="categoria_id" required></select>
        </label>
        <p class="campo-erro" data-erro-campo="categoria_id">${escapar(errosCampos.categoria_id || '')}</p>
        <label>Preço
          <input type="text" id="produto-preco" name="preco" inputmode="decimal" value="${escapar(valorCampo(produto.preco))}" required>
        </label>
        <p class="campo-erro" data-erro-campo="preco">${escapar(errosCampos.preco || '')}</p>
        <label>Custo
          <input type="text" id="produto-custo" name="custo" inputmode="decimal" value="${escapar(valorCampo(produto.custo, '0'))}">
        </label>
        <p class="campo-erro" data-erro-campo="custo">${escapar(errosCampos.custo || '')}</p>
        <label>Ícone
          <input type="text" id="produto-icone" name="icone" maxlength="10" value="${escapar(produto.icone || '')}" placeholder="🥖">
        </label>
        <div class="produtos-acoes">
          <button type="submit">Salvar</button>
          <button type="button" id="btn-cancelar-produto">Cancelar</button>
        </div>
      </form>
    </div>`;
}

export function aplicarErroSalvarProduto(modal, erro) {
  modal.aberto = true;
  modal.errosCampos = errosCamposDoBackend(erro);
  modal.erro = Object.keys(modal.errosCampos).length ? '' : mensagemErroProduto(erro);
  return modal;
}

export function errosCamposDoBackend(erro) {
  if (!(erro instanceof ApiError) || erro.status !== 400) {
    return {};
  }
  const msg = erro.mensagem || erro.message || '';
  if (/preço|preco/i.test(msg)) {
    return { preco: msg };
  }
  if (/custo/i.test(msg)) {
    return { custo: msg };
  }
  if (/categoria/i.test(msg)) {
    return { categoria_id: msg };
  }
  if (/nome/i.test(msg)) {
    return { nome: msg };
  }
  return {};
}

function valorCampo(valor, padrao = '') {
  if (valor === undefined || valor === null || valor === '') {
    return padrao;
  }
  return String(valor);
}
