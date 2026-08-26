import { escapar, dataHoje, formatarQuantidade } from './html.js';
import { htmlSeletorProduto } from '../perdas/seletor-produto.js';

export function htmlFormularioProducao({
  formulario,
  resultadosProduto,
  errosCampos = {},
  erro = '',
  confirmacao = null,
}) {
  if (confirmacao) {
    return htmlConfirmacaoRegistro(confirmacao);
  }

  const seletor = htmlSeletorProduto({
    busca: formulario.buscaProduto,
    produto: formulario.produto,
    resultados: resultadosProduto,
    erro: errosCampos.produto,
  });

  return `<div class="producao-modal" id="modal-form-producao" role="dialog" aria-modal="true" aria-labelledby="titulo-form-producao">
  <form id="form-producao" class="producao-modal-caixa producao-form">
    <header class="form-modal-cabecalho">
      <h2 id="titulo-form-producao">Lançar produção</h2>
    </header>
    <div class="form-modal-corpo">
      ${seletor}
      <label>Quantidade
        <input type="number" id="producao-quantidade" name="quantidade" min="0.001" step="0.001" value="${escapar(formulario.quantidade)}">
      </label>
      <p class="campo-erro">${escapar(errosCampos.quantidade || '')}</p>
      <label>Data
        <input type="date" id="producao-data" name="data" value="${escapar(formulario.data || dataHoje())}">
      </label>
      <p class="campo-erro">${escapar(errosCampos.data || '')}</p>
      <p class="producao-erro" role="alert">${escapar(erro)}</p>
    </div>
    <div class="producao-form-acoes">
      <button type="button" id="btn-cancelar-producao">Cancelar</button>
      <button type="submit">Lançar produção</button>
    </div>
  </form>
</div>`;
}

function htmlConfirmacaoRegistro({ producao, disponivel }) {
  return `<div class="producao-modal" id="modal-form-producao" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacao-producao">
  <aside class="producao-modal-caixa producao-confirmacao" role="status">
    <header class="form-modal-cabecalho">
      <h2 id="titulo-confirmacao-producao">Produção lançada</h2>
    </header>
    <div class="form-modal-corpo">
      <p>Produto #${escapar(producao.produto_id)} — ${formatarQuantidade(producao.quantidade)} un. em ${escapar(producao.data)}</p>
      <p>Novo saldo disponível: <strong class="producao-disponivel-confirmacao">${formatarQuantidade(disponivel)}</strong></p>
    </div>
    <div class="producao-form-acoes">
      <button type="button" id="btn-fechar-confirmacao-producao">Lançar outra produção</button>
    </div>
  </aside>
</div>`;
}
