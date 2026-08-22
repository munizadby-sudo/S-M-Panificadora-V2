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

  return `<section class="producao-formulario">
    <h2>Lançar produção</h2>
    <form id="form-producao" class="producao-form">
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
      <div class="producao-form-acoes">
        <button type="submit">Lançar produção</button>
        <button type="button" id="btn-cancelar-producao">Cancelar</button>
      </div>
    </form>
  </section>`;
}

function htmlConfirmacaoRegistro({ producao, disponivel }) {
  return `<aside class="producao-confirmacao" role="status">
    <h2>Produção lançada</h2>
    <p>Produto #${escapar(producao.produto_id)} — ${formatarQuantidade(producao.quantidade)} un. em ${escapar(producao.data)}</p>
    <p>Novo saldo disponível: <strong class="producao-disponivel-confirmacao">${formatarQuantidade(disponivel)}</strong></p>
    <button type="button" id="btn-fechar-confirmacao-producao">Lançar outra produção</button>
  </aside>`;
}
