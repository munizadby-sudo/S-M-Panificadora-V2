import { escapar } from './html.js';

export const CATEGORIAS_MANUAIS = Object.freeze(['sangria', 'suprimento']);
export const FORMAS_PAGAMENTO = Object.freeze(['dinheiro', 'pix', 'cartao']);

export function htmlFormularioLancamento({ formulario, errosCampos = {}, erro = '', desabilitado = false }) {
  const atributoDesabilitado = desabilitado ? ' disabled' : '';
  const opcoesCategoria = CATEGORIAS_MANUAIS.map(
    (categoria) =>
      `<option value="${escapar(categoria)}"${
        formulario.categoria === categoria ? ' selected' : ''
      }>${escapar(categoria)}</option>`,
  ).join('');
  const opcoesForma = FORMAS_PAGAMENTO.map(
    (forma) =>
      `<option value="${escapar(forma)}"${
        formulario.forma === forma ? ' selected' : ''
      }>${escapar(forma)}</option>`,
  ).join('');

  return `<section class="fluxo-formulario">
    <h2>Lançamento manual</h2>
    <form id="form-lancamento-fluxo" class="fluxo-form"${desabilitado ? ' aria-disabled="true"' : ''}>
      <label>Tipo
        <select id="fluxo-tipo" name="tipo"${atributoDesabilitado}>
          <option value="entrada"${formulario.tipo === 'entrada' ? ' selected' : ''}>Entrada</option>
          <option value="saida"${formulario.tipo === 'saida' ? ' selected' : ''}>Saída</option>
        </select>
      </label>
      <label>Descrição
        <input type="text" id="fluxo-descricao" name="descricao" maxlength="200" value="${escapar(formulario.descricao)}"${atributoDesabilitado}>
        ${errosCampos.descricao ? `<span class="campo-erro">${escapar(errosCampos.descricao)}</span>` : ''}
      </label>
      <label>Categoria
        <select id="fluxo-categoria" name="categoria"${atributoDesabilitado}>${opcoesCategoria}</select>
      </label>
      <label>Forma
        <select id="fluxo-forma" name="forma"${atributoDesabilitado}>${opcoesForma}</select>
      </label>
      <label>Valor (R$)
        <input type="number" id="fluxo-valor" name="valor" min="0.01" step="0.01" value="${escapar(formulario.valor)}"${atributoDesabilitado}>
        ${errosCampos.valor ? `<span class="campo-erro">${escapar(errosCampos.valor)}</span>` : ''}
      </label>
      <p class="fluxo-form-ajuda">O turno é definido automaticamente pelo caixa aberto — não é possível escolher outro turno.</p>
      <p id="fluxo-erro-form" class="fluxo-erro" role="alert">${escapar(erro)}</p>
      <div class="fluxo-form-acoes">
        <button type="submit"${atributoDesabilitado}>Registrar lançamento</button>
      </div>
    </form>
  </section>`;
}

export function formularioVazio() {
  return {
    tipo: 'saida',
    descricao: '',
    categoria: 'sangria',
    forma: 'dinheiro',
    valor: '',
  };
}
