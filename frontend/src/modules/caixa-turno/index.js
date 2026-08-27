import { getUsuario } from '../../core/session.js';
import { getTurnoAtual, obterTurnoId, peekTurno, turnoEstaAberto } from './estado.js';
import { abrirTurno, mensagemErroAbertura, obterFundoPadrao } from './abertura.js';
import {
  calcularRevisao,
  classificarDiferenca,
  completarCabecalhoComprovante,
  contagemPreenchida,
  criarControleImpressao,
  fecharTurno,
  htmlComprovanteRevisao,
  mensagemErroFechamento,
  obterPreviaFechamento,
} from './fechamento.js';
import { formatarMoeda } from '../../core/utils.js';

let overlayModal;
let containerAtual;
let modalAberto = false;
let listenerEscape;
let controleImpressao;
let previaAtual;
let resumoAtual;
let correcoesPendentes = [];
let contagemAtual = null;
let revisaoAtual = null;

export async function abrirModalCaixa() {
  if (modalAberto) {
    return;
  }
  garantirModalDom();
  containerAtual = overlayModal.querySelector('#caixa-turno-conteudo-modal');
  resumoAtual = undefined;
  correcoesPendentes = [];
  previaAtual = null;
  contagemAtual = null;
  revisaoAtual = null;
  controleImpressao = undefined;
  modalAberto = true;
  overlayModal.hidden = false;
  listenerEscape = (evento) => {
    if (evento.key === 'Escape') {
      tentarFecharModal();
    }
  };
  globalThis.document?.addEventListener?.('keydown', listenerEscape);
  await getTurnoAtual({ forcar: true });
  await renderizarTela();
}

export function fecharModalCaixa() {
  if (!modalAberto) {
    return;
  }
  modalAberto = false;
  if (overlayModal) {
    overlayModal.hidden = true;
  }
  if (listenerEscape) {
    globalThis.document?.removeEventListener?.('keydown', listenerEscape);
    listenerEscape = undefined;
  }
  controleImpressao = undefined;
  previaAtual = undefined;
  resumoAtual = undefined;
  correcoesPendentes = [];
  contagemAtual = null;
  revisaoAtual = null;
  containerAtual = undefined;
}

export function modalCaixaEstaAberto() {
  return modalAberto;
}

function garantirModalDom() {
  const doc = globalThis.document;
  if (!doc?.createElement) {
    return null;
  }
  const noDocumento = typeof doc.getElementById === 'function'
    ? doc.getElementById('modal-caixa-turno')
    : null;
  if (noDocumento) {
    overlayModal = noDocumento;
    return overlayModal;
  }
  overlayModal = null;
  overlayModal = doc.createElement('div');
  overlayModal.id = 'modal-caixa-turno';
  overlayModal.className = 'caixa-turno-modal';
  overlayModal.setAttribute('role', 'dialog');
  overlayModal.setAttribute('aria-modal', 'true');
  overlayModal.setAttribute('aria-labelledby', 'titulo-modal-caixa');
  overlayModal.hidden = true;
  overlayModal.innerHTML = `
    <div class="caixa-turno-modal-caixa">
      <div id="caixa-turno-conteudo-modal"></div>
      <button type="button" class="caixa-turno-modal-fechar" id="btn-fechar-modal-caixa" aria-label="Fechar">×</button>
    </div>
  `;
  overlayModal.addEventListener('click', (evento) => {
    if (evento.target === overlayModal) {
      tentarFecharModal();
      return;
    }
    if (evento.target?.closest?.('#btn-fechar-modal-caixa')) {
      evento.preventDefault();
      evento.stopPropagation();
      tentarFecharModal();
    }
  });
  doc.body.appendChild(overlayModal);
  return overlayModal;
}

function tentarFecharModal() {
  fecharModalCaixa();
}

async function renderizarTela() {
  const container = containerAtual;
  if (!container) {
    return;
  }
  const aberto = turnoEstaAberto();
  container.innerHTML = `
    <section class="caixa-turno">
      <h1 id="titulo-modal-caixa">Caixa</h1>
      <aside id="aviso-correcoes" class="caixa-turno-aviso" hidden></aside>
      <div id="caixa-turno-painel"></div>
    </section>
  `;
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
  contagemAtual = null;
  revisaoAtual = null;
  painel.innerHTML = `
    <div class="caixa-turno-fechamento">
      <button type="button" id="btn-fechar-caixa">Fechar caixa</button>
      <div id="area-fechamento" hidden></div>
    </div>
  `;
  painel.querySelector('#btn-fechar-caixa').addEventListener('click', async () => {
    const area = painel.querySelector('#area-fechamento');
    try {
      previaAtual = await obterPreviaFechamento();
      area.hidden = false;
      renderizarContagem(area, previaAtual);
    } catch (erro) {
      area.hidden = false;
      area.textContent = mensagemErroFechamento(erro);
    }
  });
}

function lerContagem(area) {
  return {
    dinheiro: area.querySelector('#fechamento-dinheiro').value,
    moedas: area.querySelector('#fechamento-moedas').value,
    pix: area.querySelector('#fechamento-pix').value,
    cartao: area.querySelector('#fechamento-cartao').value,
    observacao: area.querySelector('#fechamento-obs').value,
  };
}

function renderizarContagem(area, previa) {
  const esperado = previa.esperado || {};
  area.innerHTML = `
    <section class="caixa-turno-esperado" id="esperado-referencia">
      <h2>Esperado (sistema)</h2>
      <p>Dinheiro: ${formatarMoeda(esperado.dinheiro)}</p>
      <p>Pix: ${formatarMoeda(esperado.pix)}</p>
      <p>Cartão: ${formatarMoeda(esperado.cartao)}</p>
    </section>
    <form id="form-contagem-caixa" class="caixa-turno-form">
      <h2>Contagem</h2>
      <label>Dinheiro <input name="contado_dinheiro" id="fechamento-dinheiro" type="number" min="0" step="0.01" required></label>
      <label>Moedas <input name="contado_moedas" id="fechamento-moedas" type="number" min="0" step="0.01" required></label>
      <label>Pix <input name="contado_pix" id="fechamento-pix" type="number" min="0" step="0.01" required></label>
      <label>Cartão <input name="contado_cartao" id="fechamento-cartao" type="number" min="0" step="0.01" required></label>
      <label>Observação <textarea name="observacao" id="fechamento-obs"></textarea></label>
      <p id="diferenca-provisoria" class="caixa-turno-diferenca-provisoria" hidden></p>
      <p id="fechamento-erro" class="caixa-turno-erro" role="alert"></p>
      <button type="submit" id="btn-revisar-fechamento" disabled>Revisar fechamento</button>
    </form>
  `;

  const botaoRevisar = area.querySelector('#btn-revisar-fechamento');
  const diffEl = area.querySelector('#diferenca-provisoria');

  const atualizarEstado = () => {
    const contagem = lerContagem(area);
    botaoRevisar.disabled = !contagemPreenchida(contagem);
    if (!contagemPreenchida(contagem)) {
      diffEl.hidden = true;
      diffEl.textContent = '';
      return;
    }
    const revisao = calcularRevisao({ esperado, contado: contagem });
    diffEl.hidden = false;
    diffEl.textContent = `Diferença provisória: ${classificarDiferenca(revisao.status_resumo)} (${formatarMoeda(revisao.diferenca.total)})`;
  };

  for (const id of ['#fechamento-dinheiro', '#fechamento-moedas', '#fechamento-pix', '#fechamento-cartao']) {
    area.querySelector(id).addEventListener('input', atualizarEstado);
  }

  area.querySelector('#form-contagem-caixa').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const contagem = lerContagem(area);
    if (!contagemPreenchida(contagem)) {
      return;
    }
    contagemAtual = contagem;
    revisaoAtual = {
      ...calcularRevisao({ esperado, contado: contagem }),
      periodo: previa.periodo,
      turno_id: previa.turno_id ?? obterTurnoId(),
      data: peekTurno()?.data,
      observacao: contagem.observacao,
    };
    controleImpressao = criarControleImpressao();
    renderizarBoxRevisao(area, revisaoAtual);
  });
}

function renderizarBoxRevisao(area, revisao) {
  area.innerHTML = `
    <div class="caixa-turno-box-revisao" role="dialog" aria-labelledby="titulo-revisao">
      <h2 id="titulo-revisao">Revisão do fechamento</h2>
      <p>Confira os valores e imprima o comprovante antes de fechar.</p>
      <section>
        <h3>Esperado</h3>
        <p>Dinheiro: ${formatarMoeda(revisao.esperado.dinheiro)}</p>
        <p>Pix: ${formatarMoeda(revisao.esperado.pix)}</p>
        <p>Cartão: ${formatarMoeda(revisao.esperado.cartao)}</p>
      </section>
      <section>
        <h3>Contado</h3>
        <p>Dinheiro: ${formatarMoeda(revisao.contado.dinheiro)}</p>
        <p>Pix: ${formatarMoeda(revisao.contado.pix)}</p>
        <p>Cartão: ${formatarMoeda(revisao.contado.cartao)}</p>
      </section>
      <section>
        <h3>Diferença</h3>
        <p id="revisao-classificacao">${classificarDiferenca(revisao.status_resumo)}</p>
        <p>Total: ${formatarMoeda(revisao.diferenca.total)}</p>
      </section>
      <button type="button" id="btn-imprimir-comprovante">Imprimir comprovante</button>
      <button type="button" id="btn-prosseguir-sem-impressao" hidden>Prosseguir sem impressão</button>
      <p id="fechamento-erro" class="caixa-turno-erro" role="alert"></p>
      <button type="button" id="btn-voltar-contagem">Voltar à contagem</button>
      <button type="button" id="btn-confirmar-fechamento" disabled>Confirmar e fechar</button>
    </div>
  `;

  const confirmar = area.querySelector('#btn-confirmar-fechamento');
  const excecao = area.querySelector('#btn-prosseguir-sem-impressao');
  const erroEl = area.querySelector('#fechamento-erro');

  const sincronizarBotoes = () => {
    confirmar.disabled = !controleImpressao.confirmarHabilitado();
    excecao.hidden = !controleImpressao.mostrarProsseguirSemImpressao();
  };

  area.querySelector('#btn-imprimir-comprovante').addEventListener('click', async () => {
    await controleImpressao.imprimirPrevia(
      htmlComprovanteRevisao(
        completarCabecalhoComprovante(revisao, {
          usuario: getUsuario(),
          turno: peekTurno(),
        }),
      ),
    );
    sincronizarBotoes();
  });

  excecao.addEventListener('click', () => {
    controleImpressao.seguirSemImpressao();
    sincronizarBotoes();
  });

  area.querySelector('#btn-voltar-contagem').addEventListener('click', () => {
    renderizarContagem(area, previaAtual);
    if (contagemAtual) {
      area.querySelector('#fechamento-dinheiro').value = contagemAtual.dinheiro;
      area.querySelector('#fechamento-moedas').value = contagemAtual.moedas;
      area.querySelector('#fechamento-pix').value = contagemAtual.pix;
      area.querySelector('#fechamento-cartao').value = contagemAtual.cartao;
      area.querySelector('#fechamento-obs').value = contagemAtual.observacao || '';
      area.querySelector('#fechamento-dinheiro').dispatchEvent(new Event('input'));
    }
  });

  confirmar.addEventListener('click', async () => {
    if (!controleImpressao.confirmarHabilitado()) {
      return;
    }
    erroEl.textContent = '';
    try {
      resumoAtual = await fecharTurno({
        turno_id: obterTurnoId() ?? revisao.turno_id,
        contado_dinheiro: Number(contagemAtual.dinheiro),
        contado_moedas: Number(contagemAtual.moedas),
        contado_pix: Number(contagemAtual.pix),
        contado_cartao: Number(contagemAtual.cartao),
        observacao: contagemAtual.observacao || '',
        sem_impressao: controleImpressao.semImpressao(),
      });
      correcoesPendentes = [];
      contagemAtual = null;
      revisaoAtual = null;
      await renderizarTela();
    } catch (erro) {
      erroEl.textContent = mensagemErroFechamento(erro);
    }
  });

  sincronizarBotoes();
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
    </section>
  `;
}
