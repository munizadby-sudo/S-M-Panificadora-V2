import { escapar, dataHoje } from './html.js';
import { htmlSeletorProduto } from '../perdas/seletor-produto.js';
import { htmlItensEncomenda } from './itens.js';

export function htmlFormularioEncomenda({
  formulario,
  resultadosProdutoItem,
  errosCampos = {},
  erro = '',
  edicao = false,
}) {
  const seletorProdutoItem = htmlSeletorProduto({
    busca: formulario.buscaProdutoItem,
    produto: produtoComPrecoNoCusto(formulario.produtoItem),
    resultados: (resultadosProdutoItem || []).map(produtoComPrecoNoCusto),
    erro: '',
  });

  return `<div class="encomendas-modal" id="modal-form-encomenda" role="dialog" aria-modal="true" aria-labelledby="titulo-form-encomenda">
  <form id="form-encomenda" class="encomendas-modal-caixa encomendas-form">
    <header class="form-modal-cabecalho">
      <h2 id="titulo-form-encomenda">${edicao ? 'Editar encomenda' : 'Nova encomenda'}</h2>
    </header>
    <div class="form-modal-corpo">
      <div id="encomenda-cliente-seletor"></div>

      <label>Nome do contato
        <input type="text" id="encomenda-cliente-nome" name="cliente_nome" value="${escapar(formulario.clienteNome)}">
      </label>
      <p class="campo-erro">${escapar(errosCampos.clienteNome || '')}</p>

      <label>Telefone do contato
        <input type="text" id="encomenda-cliente-telefone" name="cliente_telefone" value="${escapar(formulario.clienteTelefone)}">
      </label>
      <p class="campo-erro">${escapar(errosCampos.clienteTelefone || '')}</p>

      <label>Data de entrega
        <input type="date" id="encomenda-data-entrega" name="data_entrega" value="${escapar(formulario.dataEntrega || dataHoje())}">
      </label>
      <p class="campo-erro">${escapar(errosCampos.dataEntrega || '')}</p>

      <label>Sinal
        <input type="number" id="encomenda-sinal" name="sinal" min="0" step="0.01" value="${escapar(formulario.sinal)}">
      </label>
      <p class="campo-erro">${escapar(errosCampos.sinal || '')}</p>

      <label>Observações
        <textarea id="encomenda-observacoes" name="observacoes">${escapar(formulario.observacoes)}</textarea>
      </label>

      <fieldset class="encomendas-itens">
        <legend>Itens do pedido</legend>
        <div id="encomenda-item-seletor">${seletorProdutoItem}</div>
        <label>Quantidade
          <input type="number" id="encomenda-item-quantidade" name="item_quantidade" min="0.001" step="0.001" value="${escapar(formulario.quantidadeItem)}">
        </label>
        <button type="button" id="btn-adicionar-item-encomenda">Adicionar item</button>
        <div id="encomenda-itens-container">${htmlItensEncomenda(formulario.itens)}</div>
        <p class="campo-erro">${escapar(errosCampos.itens || '')}</p>
      </fieldset>

      <p class="encomendas-erro" role="alert">${escapar(erro)}</p>
    </div>
    <div class="encomendas-form-acoes">
      <button type="button" id="btn-cancelar-form-encomenda">Cancelar</button>
      <button type="submit">${edicao ? 'Salvar alterações' : 'Cadastrar encomenda'}</button>
    </div>
  </form>
</div>`;
}

export function produtoComPrecoNoCusto(produto) {
  if (!produto) {
    return produto;
  }
  return { ...produto, custo: produto.custo ?? produto.preco };
}
