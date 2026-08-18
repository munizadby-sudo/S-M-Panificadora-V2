import { getUsuario } from '../../core/session.js';
import {
  getTurnoAtual,
  invalidarCacheTurno,
  obterTurnoId,
  onMudancaDeTurno,
  turnoEstaAberto,
} from '../caixa-turno/estado.js';
import { obterPreviaFechamento } from '../caixa-turno/fechamento.js';
import { htmlAvisoCaixaFechado, irParaTelaDeCaixa } from '../pdv/aviso.js';
import {
  criarLancamentoManual,
  excluirLancamento,
  listarFluxoCaixa,
  mensagemErroFluxo,
  obterResumoFluxo,
} from './api.js';
import { formularioVazio, htmlFormularioLancamento } from './formulario.js';
import { dataHoje, escapar } from './html.js';
import { htmlContextoTurno, htmlFiltrosFluxo, htmlTabelaFluxo } from './lista.js';
import { htmlModalExclusao, podeExcluirLancamento } from './modal-exclusao.js';
import { htmlResumoKPIs } from './resumo.js';
import { montarLinhasCsv, validarFormularioLancamento, validarMotivoExclusao } from './util.js';

export { htmlTabelaFluxo, htmlFiltrosFluxo, htmlContextoTurno } from './lista.js';
export { htmlResumoKPIs, bateComEsperadoFechamento, extrairLiquidoPorForma } from './resumo.js';
export { htmlFormularioLancamento, formularioVazio } from './formulario.js';
export { htmlModalExclusao, podeExcluirLancamento } from './modal-exclusao.js';
export { montarLinhasCsv } from './util.js';

let containerAtual;
let estado;
let cancelarOuvinteTurno;

export default {
  id: 'fluxo',
  label: 'Fluxo de Caixa',
  icone: 'ti-chart-line',
  permissao: 'fluxo',
  async montar(container) {
    if (!container) {
      return;
    }
    containerAtual = container;
    estado = estadoInicial();
    cancelarOuvinteTurno = onMudancaDeTurno(() => {
      recarregar().catch(() => {});
    });
    await recarregar();
  },
  desmontar() {
    cancelarOuvinteTurno?.();
    cancelarOuvinteTurno = undefined;
    containerAtual = undefined;
    estado = undefined;
  },
};

function estadoInicial() {
  const usuario = getUsuario();
  const hoje = dataHoje();
  return {
    ehAdmin: usuario?.role === 'admin',
    turnoAberto: false,
    turnoId: null,
    turnoPeriodo: '',
    fundoEspecie: 0,
    fundoMoedas: 0,
    modoConsulta: 'turno',
    filtros: {
      dataInicio: hoje,
      dataFim: hoje,
      categoria: '',
      tipo: '',
      geradoAuto: '',
    },
    itens: [],
    resumo: null,
    previewEsperado: null,
    erro: '',
    formulario: formularioVazio(),
    errosCampos: {},
    erroFormulario: '',
    exclusaoModal: null,
    erroExclusao: '',
  };
}

async function recarregar() {
  await sincronizarTurno();
  await Promise.all([carregarLista(), carregarResumo()]);
  renderizar();
}

async function sincronizarTurno() {
  const status = await getTurnoAtual();
  estado.turnoAberto = turnoEstaAberto();
  estado.turnoId = obterTurnoId();
  estado.turnoPeriodo = status?.turno?.periodo ?? '';
  estado.fundoEspecie = Number(status?.turno?.fundo_especie ?? status?.turno?.fundoEspecie ?? 0);
  estado.fundoMoedas = Number(status?.turno?.fundo_moedas ?? status?.turno?.fundoMoedas ?? 0);
  estado.modoConsulta = estado.turnoAberto ? 'turno' : 'periodo';
}

async function carregarLista() {
  try {
    estado.erro = '';
    const params = {
      page: 1,
      limit: 100,
      ativo: 1,
    };

    if (estado.turnoAberto && estado.turnoId) {
      params.turno_id = estado.turnoId;
    } else {
      params.data_inicio = estado.filtros.dataInicio || undefined;
      params.data_fim = estado.filtros.dataFim || undefined;
    }

    if (estado.filtros.categoria) {
      params.categoria = estado.filtros.categoria;
    }
    if (estado.filtros.tipo) {
      params.tipo = estado.filtros.tipo;
    }
    if (estado.filtros.geradoAuto !== '') {
      params.gerado_auto = estado.filtros.geradoAuto;
    }

    const resposta = await listarFluxoCaixa(params);
    estado.itens = resposta.data || [];
  } catch (erro) {
    estado.itens = [];
    estado.erro = mensagemErroFluxo(erro);
  }
}

async function carregarResumo() {
  if (!estado.turnoAberto || !estado.turnoId) {
    estado.resumo = null;
    estado.previewEsperado = null;
    return;
  }

  try {
    const [resumo, preview] = await Promise.all([
      obterResumoFluxo(estado.turnoId),
      obterPreviaFechamento(),
    ]);
    estado.resumo = resumo;
    estado.previewEsperado = preview?.esperado ?? null;
  } catch {
    estado.resumo = null;
    estado.previewEsperado = null;
  }
}

function renderizar() {
  const container = containerAtual;
  if (!container) {
    return;
  }

  const caixaFechado = !estado.turnoAberto;
  const kpis = estado.turnoAberto ? htmlResumoKPIs(estado.resumo) : '';
  const aviso = caixaFechado ? htmlAvisoCaixaFechado() : '';
  const formulario = htmlFormularioLancamento({
    formulario: estado.formulario,
    errosCampos: estado.errosCampos,
    erro: estado.erroFormulario,
    desabilitado: caixaFechado,
  });

  container.innerHTML = `
    <section class="fluxo-caixa">
      <h1>Fluxo de Caixa</h1>
      ${htmlContextoTurno(estado)}
      ${kpis}
      ${htmlFiltrosFluxo({ filtros: estado.filtros, turnoAberto: estado.turnoAberto })}
      <div class="fluxo-acoes-topo">
        <button type="button" id="btn-exportar-fluxo-csv"${estado.itens.length ? '' : ' disabled'}>Exportar CSV</button>
      </div>
      <p id="fluxo-erro-lista" class="fluxo-erro" role="alert">${escapar(estado.erro)}</p>
      <div id="lista-fluxo">${htmlTabelaFluxo(estado.itens, { ehAdmin: estado.ehAdmin })}</div>
      ${aviso}
      ${formulario}
      ${htmlModalExclusao({ lancamento: estado.exclusaoModal, erro: estado.erroExclusao })}
    </section>
  `;

  ligarEventos(container);
}

function ligarEventos(container) {
  container.querySelector('#form-filtro-fluxo')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!estado.turnoAberto) {
      estado.filtros.dataInicio = container.querySelector('#fluxo-data-inicio')?.value || '';
      estado.filtros.dataFim = container.querySelector('#fluxo-data-fim')?.value || '';
    }
    estado.filtros.categoria = container.querySelector('#fluxo-filtro-categoria')?.value || '';
    estado.filtros.tipo = container.querySelector('#fluxo-filtro-tipo')?.value || '';
    estado.filtros.geradoAuto = container.querySelector('#fluxo-filtro-gerado-auto')?.value ?? '';
    await carregarLista();
    renderizar();
  });

  container.querySelector('#btn-exportar-fluxo-csv')?.addEventListener('click', () => {
    exportarCsvAtual();
  });

  container.querySelector('#btn-ir-para-caixa')?.addEventListener('click', () => {
    irParaTelaDeCaixa(container.ownerDocument || globalThis.document);
  });

  container.querySelector('#form-lancamento-fluxo')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!estado.turnoAberto) {
      return;
    }
    await salvarLancamento(container);
  });

  for (const botao of container.querySelectorAll?.('[data-excluir-fluxo]') || []) {
    botao.addEventListener('click', () => {
      const id = Number(botao.getAttribute('data-excluir-fluxo'));
      const lancamento = estado.itens.find((item) => Number(item.id) === id);
      if (!podeExcluirLancamento(lancamento, estado.ehAdmin)) {
        return;
      }
      estado.exclusaoModal = lancamento;
      estado.erroExclusao = '';
      renderizar();
    });
  }

  container.querySelector('#btn-cancelar-exclusao-fluxo')?.addEventListener('click', () => {
    estado.exclusaoModal = null;
    estado.erroExclusao = '';
    renderizar();
  });

  container.querySelector('#btn-confirmar-exclusao-fluxo')?.addEventListener('click', async () => {
    await confirmarExclusao(container);
  });
}

async function salvarLancamento(container) {
  const validacao = validarFormularioLancamento({
    tipo: container.querySelector('#fluxo-tipo')?.value,
    descricao: container.querySelector('#fluxo-descricao')?.value,
    categoria: container.querySelector('#fluxo-categoria')?.value,
    forma: container.querySelector('#fluxo-forma')?.value,
    valor: container.querySelector('#fluxo-valor')?.value,
  });

  if (!validacao.ok) {
    estado.errosCampos = validacao.erros;
    estado.erroFormulario = '';
    renderizar();
    return;
  }

  try {
    estado.errosCampos = {};
    estado.erroFormulario = '';
    await criarLancamentoManual(validacao.valores);
    estado.formulario = formularioVazio();
    invalidarCacheTurno();
    await recarregar();
  } catch (erro) {
    estado.erroFormulario = mensagemErroFluxo(erro);
    renderizar();
  }
}

async function confirmarExclusao(container) {
  const lancamento = estado.exclusaoModal;
  if (!lancamento) {
    return;
  }

  const validacao = validarMotivoExclusao(
    container.querySelector('#fluxo-motivo-exclusao')?.value,
  );
  if (!validacao.ok) {
    estado.erroExclusao = validacao.erro;
    renderizar();
    return;
  }

  try {
    estado.erroExclusao = '';
    await excluirLancamento(lancamento.id, validacao.valor);
    estado.exclusaoModal = null;
    invalidarCacheTurno();
    await recarregar();
  } catch (erro) {
    estado.erroExclusao = mensagemErroFluxo(erro);
    renderizar();
  }
}

function exportarCsvAtual() {
  if (!estado.itens.length) {
    return;
  }

  const conteudo = `\uFEFF${montarLinhasCsv(estado.itens)}`;
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = globalThis.document?.createElement?.('a');
  if (!link) {
    return;
  }
  link.href = url;
  link.download = `fluxo-caixa-${dataHoje()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
