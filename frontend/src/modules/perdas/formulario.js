import { escapar, formatarMoeda, dataHoje } from './html.js';
import { htmlOpcoesMotivo } from './motivos.js';
import { htmlSeletorProduto } from './seletor-produto.js';

export function htmlFormularioPerda({
  formulario,
  resultadosProduto,
  previaCusto,
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

  const previa =
    previaCusto != null
      ? `<p class="perdas-previa-custo">Prévia de custo: <strong>${formatarMoeda(previaCusto)}</strong> <span class="perdas-previa-ajuda">(estimativa local — o valor oficial vem do backend após salvar)</span></p>`
      : '';

  return `<div class="perdas-modal" id="modal-form-perda" role="dialog" aria-modal="true" aria-labelledby="titulo-form-perda">
  <form id="form-perda" class="perdas-modal-caixa perdas-form">
    <header class="form-modal-cabecalho">
      <h2 id="titulo-form-perda">Registrar perda</h2>
    </header>
    <div class="form-modal-corpo">
      ${seletor}
      <label>Quantidade
        <input type="number" id="perda-quantidade" name="quantidade" min="0.001" step="0.001" value="${escapar(formulario.quantidade)}">
      </label>
      <p class="campo-erro">${escapar(errosCampos.quantidade || '')}</p>
      <label>Motivo
        <select id="perda-motivo" name="motivo">${htmlOpcoesMotivo(formulario.motivo || 'queimado')}</select>
      </label>
      <p class="campo-erro">${escapar(errosCampos.motivo || '')}</p>
      <label>Data
        <input type="date" id="perda-data" name="data" value="${escapar(formulario.data || dataHoje())}">
      </label>
      <p class="campo-erro">${escapar(errosCampos.data || '')}</p>
      ${previa}
      <p class="perdas-erro" role="alert">${escapar(erro)}</p>
    </div>
    <div class="perdas-form-acoes">
      <button type="button" id="btn-cancelar-perda">Cancelar</button>
      <button type="submit">Registrar perda</button>
    </div>
  </form>
</div>`;
}

function htmlConfirmacaoRegistro({ perda, disponivel }) {
  return `<div class="perdas-modal" id="modal-form-perda" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacao-perda">
  <aside class="perdas-modal-caixa perdas-confirmacao" role="status">
    <header class="form-modal-cabecalho">
      <h2 id="titulo-confirmacao-perda">Perda registrada</h2>
    </header>
    <div class="form-modal-corpo">
      <p>Produto #${escapar(perda.produto_id)} — ${formatarQuantidade(perda.quantidade)} un. em ${escapar(perda.data)}</p>
      <p>Custo calculado (backend): <strong>${formatarMoeda(perda.custo_calculado)}</strong></p>
      <p>Novo saldo disponível: <strong class="perdas-disponivel-confirmacao">${formatarQuantidade(disponivel)}</strong></p>
    </div>
    <div class="perdas-form-acoes">
      <button type="button" id="btn-fechar-confirmacao">Registrar outra perda</button>
    </div>
  </aside>
</div>`;
}

function formatarQuantidade(valor) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(valor));
}
