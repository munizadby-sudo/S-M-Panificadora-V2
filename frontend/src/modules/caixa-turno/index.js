import { getTurnoAtual, obterTurnoId, turnoEstaAberto } from './estado.js';
import { montarBanner } from './banner.js';
import { abrirTurno, mensagemErroAbertura, obterFundoPadrao } from './abertura.js';
import {
  classificarDiferenca,
  criarControleImpressao,
  fecharTurno,
  htmlPreviaImprimivel,
  htmlResumoImprimivel,
  imprimirHtml,
  mensagemErroFechamento,
  obterPreviaFechamento,
} from './fechamento.js';
import { formatarMoeda } from '../../core/utils.js';

let cancelarBanner;
let containerAtual;
let controleImpressao;
let previaAtual;
let resumoAtual;
let correcoesPendentes = [];

export default {
  id: 'caixa-turno',
  label: 'Caixa',
  icone: 'ti-cash-banknote',
  permissao: 'caixa',
  async montar(container) {
    if (!container) {
      return;
    }
    containerAtual = container;
    resumoAtual = undefined;
    correcoesPendentes = [];
    await getTurnoAtual({ forcar: true });
    await renderizarTela();
  },
  desmontar() {
    cancelarBanner?.();
    cancelarBanner = undefined;
    controleImpressao = undefined;
    previaAtual = undefined;
    resumoAtual = undefined;
    correcoesPendentes = [];
    containerAtual = undefined;
  },
};

async function renderizarTela() {
  const container = containerAtual;
  if (!container) {
    return;
  }
  cancelarBanner?.();
  const aberto = turnoEstaAberto();
  container.innerHTML = `
    <section class="caixa-turno">
      <h1>Caixa</h1>
      <div id="caixa-turno-status-modulo" class="caixa-turno-banner" role="status"></div>
      <aside id="aviso-correcoes" class="caixa-turno-aviso" hidden></aside>
      <div id="caixa-turno-painel"></div>
    </section>
  `;
  cancelarBanner = await montarBanner(container.querySelector('#caixa-turno-status-modulo'));
  mostrarCorrecoes(container.querySelector('#aviso-correcoes'), correcoesPendentes);
  const painel = container.querySelector('#caixa-turno-painel');
  if (resumoAtual) {
    renderizarResumo(painel, resumoAtual);
    return;
  }
  if (aberto) {
    renderizarFechamento(painel);
    return;
  }
  await renderizarAbertura(painel);
}

async function renderizarAbertura(painel) {
  const fundo = await obterFundoPadrao();
  painel.innerHTML = `
    <form id="form-abrir-caixa" class="caixa-turno-form">
      <h2>Abrir turno</h2>
      <p>Confira o fundo na gaveta. Os valores vêm pré-preenchidos e podem ser ajustados.</p>
      <label>Espécie <input id="abertura-especie" name="fundo_especie" type="number" min="0" step="0.01" required></label>
      <label>Moedas <input id="abertura-moedas" name="fundo_moedas" type="number" min="0" step="0.01" required></label>
      <p id="abertura-total"></p>
      <p id="abertura-erro" class="caixa-turno-erro" role="alert"></p>
      <button type="submit">Confirmar abertura</button>
    </form>
  `;
  const especie = painel.querySelector('#abertura-especie');
  const moedas = painel.querySelector('#abertura-moedas');
  const total = painel.querySelector('#abertura-total');
  especie.value = fundo.fundo_especie;
  moedas.value = fundo.fundo_moedas;
  const atualizarTotal = () => {
    total.textContent = `Total: ${formatarMoeda(Number(especie.value) + Number(moedas.value))}`;
  };
  atualizarTotal();
  especie.addEventListener('input', atualizarTotal);
  moedas.addEventListener('input', atualizarTotal);

  painel.querySelector('#form-abrir-caixa').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const erroEl = painel.querySelector('#abertura-erro');
    erroEl.textContent = '';
    try {
      const resposta = await abrirTurno({
        fundo_especie: especie.value,
        fundo_moedas: moedas.value,
      });
      correcoesPendentes = resposta.correcoes_pendentes || [];
      await renderizarTela();
    } catch (erro) {
      erroEl.textContent = mensagemErroAbertura(erro);
    }
  });
}

export function mostrarCorrecoes(el, lista) {
  if (!el) {
    return;
  }
  if (!Array.isArray(lista) || lista.length === 0) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  el.innerHTML = `<strong>Correções pendentes</strong><ul>${lista
    .map((item) => `<li>${item.motivo || 'Correção pendente'} (venda ${item.venda_id ?? '—'})</li>`)
    .join('')}</ul>`;
}

function renderizarFechamento(painel) {
  controleImpressao = criarControleImpressao();
  previaAtual = null;
  painel.innerHTML = `
    <div class="caixa-turno-fechamento">
      <button type="button" id="btn-fechar-caixa">Fechar caixa</button>
      <div id="previa-fechamento" hidden></div>
    </div>
  `;
  painel.querySelector('#btn-fechar-caixa').addEventListener('click', async () => {
    const area = painel.querySelector('#previa-fechamento');
    try {
      previaAtual = await obterPreviaFechamento();
      area.hidden = false;
      renderizarPrevia(area, previaAtual);
    } catch (erro) {
      area.hidden = false;
      area.textContent = mensagemErroFechamento(erro);
    }
  });
}

function renderizarPrevia(area, previa) {
  const esperado = previa.esperado || {};
  area.innerHTML = `
    <section id="previa-imprimivel">
      <h2>Prévia de fechamento</h2>
      <p>Esperado dinheiro: ${formatarMoeda(esperado.dinheiro)}</p>
      <p>Esperado pix: ${formatarMoeda(esperado.pix)}</p>
      <p>Esperado cartão: ${formatarMoeda(esperado.cartao)}</p>
    </section>
    <button type="button" id="btn-imprimir-previa">Imprimir prévia</button>
    <button type="button" id="btn-prosseguir-sem-impressao" hidden>Prosseguir sem impressão</button>
    <form id="form-fechar-caixa" class="caixa-turno-form">
      <h2>Contagem</h2>
      <label>Dinheiro <input name="contado_dinheiro" id="fechamento-dinheiro" type="number" min="0" step="0.01" required></label>
      <label>Moedas <input name="contado_moedas" id="fechamento-moedas" type="number" min="0" step="0.01" required></label>
      <label>Pix <input name="contado_pix" id="fechamento-pix" type="number" min="0" step="0.01" required></label>
      <label>Cartão <input name="contado_cartao" id="fechamento-cartao" type="number" min="0" step="0.01" required></label>
      <label>Observação <textarea name="observacao" id="fechamento-obs"></textarea></label>
      <p id="fechamento-erro" class="caixa-turno-erro" role="alert"></p>
      <button type="submit" id="btn-confirmar-fechamento" disabled>Confirmar fechamento</button>
    </form>
  `;
  const confirmar = area.querySelector('#btn-confirmar-fechamento');
  const excecao = area.querySelector('#btn-prosseguir-sem-impressao');

  area.querySelector('#btn-imprimir-previa').addEventListener('click', async () => {
    await controleImpressao.imprimirPrevia(htmlPreviaImprimivel(previa));
    confirmar.disabled = !controleImpressao.confirmarHabilitado();
    excecao.hidden = !controleImpressao.mostrarProsseguirSemImpressao();
  });

  excecao.addEventListener('click', () => {
    controleImpressao.seguirSemImpressao();
    confirmar.disabled = !controleImpressao.confirmarHabilitado();
    excecao.hidden = true;
  });

  area.querySelector('#form-fechar-caixa').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!controleImpressao.confirmarHabilitado()) {
      return;
    }
    const erroEl = area.querySelector('#fechamento-erro');
    erroEl.textContent = '';
    try {
      resumoAtual = await fecharTurno({
        turno_id: obterTurnoId() ?? previaAtual?.turno_id,
        contado_dinheiro: Number(area.querySelector('#fechamento-dinheiro').value),
        contado_moedas: Number(area.querySelector('#fechamento-moedas').value),
        contado_pix: Number(area.querySelector('#fechamento-pix').value),
        contado_cartao: Number(area.querySelector('#fechamento-cartao').value),
        observacao: area.querySelector('#fechamento-obs').value,
        sem_impressao: controleImpressao.semImpressao(),
      });
      correcoesPendentes = [];
      await renderizarTela();
    } catch (erro) {
      erroEl.textContent = mensagemErroFechamento(erro);
    }
  });
}

function renderizarResumo(area, resumo) {
  area.innerHTML = `
    <section class="caixa-turno-resumo">
      <h2>Turno fechado</h2>
      <p id="resumo-classificacao">${classificarDiferenca(resumo.status_resumo)}</p>
      <p>Diferença dinheiro: ${formatarMoeda(resumo.diferenca?.dinheiro)}</p>
      <p>Diferença pix: ${formatarMoeda(resumo.diferenca?.pix)}</p>
      <p>Diferença cartão: ${formatarMoeda(resumo.diferenca?.cartao)}</p>
      <p id="resumo-diferenca-total">Diferença total: ${formatarMoeda(resumo.diferenca?.total)}</p>
      <button type="button" id="btn-imprimir-resumo">Imprimir resumo</button>
    </section>
  `;
  area.querySelector('#btn-imprimir-resumo')?.addEventListener('click', async () => {
    try {
      await imprimirHtml(htmlResumoImprimivel(resumo));
    } catch {
      /* impressão do resumo é opcional */
    }
  });
}
