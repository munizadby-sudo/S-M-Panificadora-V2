import { ApiError } from '../../core/api.js';
import { mensagemErroEstoque } from './api.js';
import { escapar, formatarQuantidade } from './html.js';

export function htmlModalEdicaoEstoque({ item = {}, erro = '', errosCampos = {} } = {}) {
  return `<div class="estoque-modal" id="modal-estoque" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-estoque">
      <form id="form-estoque" class="estoque-modal-caixa estoque-form-edicao" data-produto-id="${escapar(item.produto_id || '')}">
        <h2 id="titulo-modal-estoque">Editar estoque — ${escapar(item.nome || '')}</h2>
        <p id="estoque-erro-modal" class="estoque-erro" role="alert">${escapar(erro)}</p>
        <p class="estoque-somente-leitura">Vendido <strong>${formatarQuantidade(item.vendido)}</strong></p>
        <p class="estoque-somente-leitura">Disponível <strong>${formatarQuantidade(item.disponivel)}</strong></p>
        <label>Inicial
          <input type="text" id="estoque-inicial" name="inicial" inputmode="decimal" value="${escapar(valorCampo(item.inicial))}">
        </label>
        <p class="campo-erro" data-erro-campo="inicial">${escapar(errosCampos.inicial || '')}</p>
        <label>Produzido
          <input type="text" id="estoque-produzido" name="produzido" inputmode="decimal" value="${escapar(valorCampo(item.produzido))}">
        </label>
        <p class="campo-erro" data-erro-campo="produzido">${escapar(errosCampos.produzido || '')}</p>
        <label>Mínimo
          <input type="text" id="estoque-minimo" name="minimo" inputmode="decimal" value="${escapar(valorCampo(item.minimo))}">
        </label>
        <p class="campo-erro" data-erro-campo="minimo">${escapar(errosCampos.minimo || '')}</p>
        <div class="estoque-acoes">
          <button type="submit">Salvar</button>
          <button type="button" id="btn-cancelar-estoque">Cancelar</button>
        </div>
      </form>
    </div>`;
}

export function aplicarErroSalvarEstoque(modal, erro) {
  modal.aberto = true;
  modal.errosCampos = errosCamposDoBackend(erro);
  modal.erro = Object.keys(modal.errosCampos).length ? '' : mensagemErroEstoque(erro);
  return modal;
}

export function errosCamposDoBackend(erro) {
  if (!(erro instanceof ApiError) || erro.status !== 400) {
    return {};
  }
  const msg = erro.mensagem || erro.message || '';
  if (/inicial/i.test(msg)) {
    return { inicial: msg };
  }
  if (/produzido/i.test(msg)) {
    return { produzido: msg };
  }
  if (/m[ií]nimo/i.test(msg)) {
    return { minimo: msg };
  }
  return {};
}

function valorCampo(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return '';
  }
  return String(valor);
}
