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

  return `<section class="perdas-formulario">
    <h2>Registrar perda</h2>
    <form id="form-perda" class="perdas-form">
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
      <div class="perdas-form-acoes">
        <button type="submit">Registrar perda</button>
        <button type="button" id="btn-cancelar-perda">Cancelar</button>
      </div>
    </form>
  </section>`;
}

function htmlConfirmacaoRegistro({ perda, disponivel }) {
  return `<aside class="perdas-confirmacao" role="status">
    <h2>Perda registrada</h2>
    <p>Produto #${escapar(perda.produto_id)} — ${formatarQuantidade(perda.quantidade)} un. em ${escapar(perda.data)}</p>
    <p>Custo calculado (backend): <strong>${formatarMoeda(perda.custo_calculado)}</strong></p>
    <p>Novo saldo disponível: <strong class="perdas-disponivel-confirmacao">${formatarQuantidade(disponivel)}</strong></p>
    <button type="button" id="btn-fechar-confirmacao">Registrar outra perda</button>
  </aside>`;
}

function formatarQuantidade(valor) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(valor));
}
