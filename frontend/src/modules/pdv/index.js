import { debounce } from '../../core/utils.js';
import { ehAdmin } from '../../core/session.js';
import { getTurnoAtual, obterTurnoId, onMudancaDeTurno, turnoEstaAberto } from '../caixa-turno/estado.js';
import { listarCategorias, listarProdutos, mensagemErroProduto } from '../produtos/api.js';
import { montarSeletorCategoria } from '../produtos/categorias.js';
import { htmlAvisoCaixaFechado } from './aviso.js';
import { htmlGradeProdutos, htmlLegendaAtalhos } from './grade.js';
import { htmlListaVendasTurno } from './lista-turno.js';
import { htmlModalEstornoVenda } from './modal-estorno-venda.js';
import { ligarNavegacaoGrade } from './navegacao-grade.js';
import {
  deveRoubarTeclaDeEdicao,
  enterAdicionaDaBusca,
  indiceCategoriaPorTecla,
  setasNavegamPelaGrade,
} from './atalhos.js';
import { abrirCupomNaoFiscal } from './cupom.js';
import {
  adicionarAoCarrinho,
  htmlCarrinho,
  limparCarrinho,
  removerDoCarrinho,
  removerUltimoDoCarrinho,
  totalLocal,
} from './carrinho.js';
import {
  ATALHOS_FORMA_PAGAMENTO,
  atualizarTrocoNoDom,
  htmlSeletorFormaPagamento,
  podeConfirmarVenda,
} from './pagamento.js';
import {
  abrirModalPagamento,
  fecharModalPagamento,
  modalPagamentoEstaAberto,
} from './modal-pagamento.js';
import { fecharModalImpressao } from './modal-impressao.js';
import { htmlConfirmacaoVenda } from './confirmacao.js';
import { criarVenda, estornarVenda, listarVendas, mensagemErroEstorno, mensagemErroVenda } from './api.js';

let containerAtual;
let estado;
let cancelarTurno;
let buscarDebounced;
let listenerAtalhos;
let navegacaoGrade;

export default {
  id: 'pdv',
  label: 'Vendas',
  icone: 'ti-shopping-cart',
  permissao: 'caixa',
  async montar(container) {
    if (!container) {
      return;
    }
    containerAtual = container;
    estado = estadoInicial();
    await getTurnoAtual({ forcar: true });
    estado.aberto = turnoEstaAberto();
    cancelarTurno = onMudancaDeTurno((status) => {
      const aberto = Boolean(status?.aberto);
      if (!estado || aberto === estado.aberto) {
        return;
      }
      estado.aberto = aberto;
      if (!aberto) {
        fecharModalPagamento();
        fecharModalEstorno();
        estado.vendasTurno = [];
        renderizar().catch(() => {});
        return;
      }
      carregarVendasTurno()
        .then(() => renderizar())
        .catch(() => {});
    });
    listenerAtalhos = (evento) => {
      tratarAtalhoPdv(evento);
    };
    globalThis.document?.addEventListener?.('keydown', listenerAtalhos);
    await renderizar();
    if (estado.aberto) {
      await carregarVendasTurno();
      await renderizar();
    }
  },
  desmontar() {
    cancelarTurno?.();
    cancelarTurno = undefined;
    if (listenerAtalhos) {
      globalThis.document?.removeEventListener?.('keydown', listenerAtalhos);
      listenerAtalhos = undefined;
    }
    navegacaoGrade?.desligar?.();
    navegacaoGrade = undefined;
    fecharModalPagamento();
    fecharModalImpressao();
    buscarDebounced = undefined;
    containerAtual = undefined;
    estado = undefined;
  },
};

function estadoInicial() {
  return {
    aberto: false,
    busca: '',
    categoriaId: '',
    categorias: [],
    produtos: [],
    erroGrade: '',
    carrinho: [],
    formaPagamento: '',
    recebido: '',
    erroVenda: '',
    avisoFinalizar: '',
    ultimaVenda: null,
    confirmando: false,
    vendasTurno: [],
    erroVendas: '',
    vendaEstorno: null,
    motivoEstorno: '',
    erroEstorno: '',
    estornando: false,
  };
}

function resetarEstadoPagamento() {
  if (!estado) {
    return;
  }
  estado.formaPagamento = '';
  estado.recebido = '';
  estado.erroVenda = '';
}

async function renderizar(opcoes = {}) {
  const container = containerAtual;
  if (!container || !estado) {
    return;
  }
  if (!estado.aberto) {
    fecharModalPagamento();
    container.innerHTML = `
      <section class="pdv">
        <h1>Vendas</h1>
        ${htmlAvisoCaixaFechado()}
      </section>
    `;
    return;
  }

  if (!estado.produtos.length && !estado.erroGrade) {
    await carregarCatalogo();
  }

  const carrinhoVazio = estado.carrinho.length === 0 || totalLocal(estado.carrinho) <= 0;
  const focoUi = opcoes.focarGrade ? { tipo: 'grade' } : capturarFocoUi(container);

  container.innerHTML = `
    <section class="pdv">
      <header class="pdv-topo">
        ${htmlLegendaAtalhos()}
        <h1>Vendas</h1>
      </header>
      ${htmlConfirmacaoVenda(estado.ultimaVenda)}
      <div class="pdv-painel">
        ${htmlGradeProdutos({
          produtos: estado.produtos,
          busca: estado.busca,
          erro: estado.erroGrade,
        })}
        <div class="pdv-lateral">
          ${htmlCarrinho(estado.carrinho)}
          <p id="pdv-aviso-finalizar" class="pdv-erro" role="alert">${escaparAviso(estado.avisoFinalizar)}</p>
          <button type="button" id="btn-finalizar-venda"${carrinhoVazio ? ' disabled' : ''}>
            Finalizar Venda <span class="atalho">F10</span>
          </button>
          ${htmlListaVendasTurno({
            vendas: estado.vendasTurno,
            ehAdmin: ehAdmin(),
            erro: estado.erroVendas,
          })}
        </div>
      </div>
      ${htmlModalEstornoVenda({
        venda: estado.vendaEstorno,
        erro: estado.erroEstorno,
        enviando: estado.estornando,
        motivo: estado.motivoEstorno,
      })}
    </section>
  `;

  montarSeletorCategoria(container.querySelector('#pdv-categoria'), estado.categorias, {
    incluirTodos: true,
    rotuloTodos: 'Todas',
    valor: estado.categoriaId,
  });
  ligarEventos(container, focoUi);

  if (modalPagamentoEstaAberto()) {
    abrirModalPagamento({
      renderizarConteudo: (conteudo) => preencherConteudoPagamento(conteudo),
      aoFechar: aoFecharModalPagamento,
    });
    return;
  }
  restaurarFocoUi(container, focoUi);
}

function capturarFocoUi(container) {
  const ativo = globalThis.document?.activeElement;
  if (!ativo) {
    return { tipo: 'nenhum' };
  }
  if (typeof container?.contains === 'function' && !container.contains(ativo)) {
    return { tipo: 'nenhum' };
  }
  if (ativo.id === 'pdv-busca') {
    return {
      tipo: 'busca',
      inicio: ativo.selectionStart ?? String(ativo.value || '').length,
      fim: ativo.selectionEnd ?? String(ativo.value || '').length,
    };
  }
  if (ativo.id === 'pdv-categoria') {
    return { tipo: 'categoria' };
  }
  const produtoId = ativo.getAttribute?.('data-adicionar-produto');
  if (produtoId) {
    return { tipo: 'grade', produtoId: String(produtoId) };
  }
  return { tipo: 'nenhum' };
}

function restaurarFocoUi(container, foco) {
  if (!container || !foco || foco.tipo === 'nenhum') {
    return;
  }
  if (foco.tipo === 'busca') {
    const campo = container.querySelector('#pdv-busca');
    campo?.focus?.();
    if (campo && typeof campo.setSelectionRange === 'function') {
      const tam = String(campo.value || '').length;
      const inicio = Math.min(Number(foco.inicio) || 0, tam);
      const fim = Math.min(Number(foco.fim) || 0, tam);
      campo.setSelectionRange(inicio, fim);
    }
    return;
  }
  if (foco.tipo === 'categoria') {
    container.querySelector('#pdv-categoria')?.focus?.();
    return;
  }
  if (foco.tipo === 'grade') {
    const alvo = foco.produtoId
      ? container.querySelector(`[data-adicionar-produto="${foco.produtoId}"]`)
      : container.querySelector('#pdv-grade-itens .pdv-produto');
    alvo?.focus?.();
  }
}

function escaparAviso(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function carregarCatalogo() {
  try {
    estado.erroGrade = '';
    const [produtos, categorias] = await Promise.all([
      listarProdutos({
        busca: estado.busca?.trim() || undefined,
        categoria_id: estado.categoriaId || undefined,
        ativo: 1,
        limit: 200,
      }),
      listarCategorias({ ativo: 1 }),
    ]);
    estado.produtos = produtos.data || [];
    estado.categorias = categorias.data || [];
  } catch (erro) {
    estado.produtos = [];
    estado.erroGrade = mensagemErroProduto(erro);
  }
}

function ligarEventos(container, focoUi) {
  buscarDebounced =
    buscarDebounced ||
    debounce(async () => {
      await carregarCatalogo();
      await renderizar();
    }, 250);

  container.querySelector('#form-filtro-pdv')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    estado.busca = container.querySelector('#pdv-busca')?.value?.trim() || '';
    estado.categoriaId = container.querySelector('#pdv-categoria')?.value || '';
    await carregarCatalogo();
    await renderizar();
  });

  container.querySelector('#pdv-busca')?.addEventListener('input', (evento) => {
    estado.busca = evento.target?.value ?? '';
    buscarDebounced();
  });

  container.querySelector('#pdv-categoria')?.addEventListener('change', async (evento) => {
    estado.categoriaId = evento.target?.value || '';
    await carregarCatalogo();
    await renderizar({ focarGrade: true });
  });

  for (const botao of container.querySelectorAll?.('[data-adicionar-produto]') || []) {
    botao.addEventListener('click', () => {
      adicionarProdutoDoCard(botao);
    });
  }

  for (const botao of container.querySelectorAll?.('[data-remover-item]') || []) {
    botao.addEventListener('click', () => {
      estado.carrinho = removerDoCarrinho(estado.carrinho, botao.getAttribute('data-remover-item'));
      renderizar();
    });
  }

  container.querySelector('#btn-remover-ultimo')?.addEventListener('click', () => {
    estado.carrinho = removerUltimoDoCarrinho(estado.carrinho);
    renderizar();
  });

  container.querySelector('#btn-limpar-carrinho')?.addEventListener('click', () => {
    estado.carrinho = limparCarrinho();
    renderizar();
  });

  container.querySelector('#btn-finalizar-venda')?.addEventListener('click', () => {
    tentarAbrirPagamento();
  });

  ligarEventosEstorno(container);
  if (estado.vendaEstorno) {
    container.querySelector('#pdv-estorno-motivo')?.focus?.();
  }

  navegacaoGrade?.desligar?.();
  const cards = [...(container.querySelectorAll?.('[data-adicionar-produto]') || [])];
  let indiceInicial = 0;
  if (focoUi?.tipo === 'grade' && focoUi.produtoId) {
    const idx = cards.findIndex(
      (card) => String(card.getAttribute?.('data-adicionar-produto')) === String(focoUi.produtoId),
    );
    if (idx >= 0) {
      indiceInicial = idx;
    }
  }
  navegacaoGrade = ligarNavegacaoGrade(container.querySelector('#pdv-grade-itens'), {
    indiceInicial,
    aoAtivar(card) {
      adicionarProdutoDoCard(card);
    },
  });
}

function adicionarProdutoDoCard(card) {
  if (!estado || !card) {
    return;
  }
  const id = Number(card.getAttribute?.('data-adicionar-produto'));
  const produto = estado.produtos.find((item) => Number(item.id) === id);
  if (!produto) {
    return;
  }
  estado.carrinho = adicionarAoCarrinho(estado.carrinho, produto);
  estado.ultimaVenda = null;
  estado.erroVenda = '';
  estado.avisoFinalizar = '';
  renderizar();
}

async function selecionarCategoriaPorIndice(indice) {
  if (!estado) {
    return;
  }
  if (indice === 0) {
    estado.categoriaId = '';
  } else {
    const categoria = estado.categorias[indice - 1];
    if (!categoria) {
      return;
    }
    estado.categoriaId = String(categoria.id);
  }
  estado.busca = '';
  await carregarCatalogo();
  await renderizar({ focarGrade: true });
}

function tentarLimparCarrinhoPorEsc() {
  if (!estado?.carrinho?.length) {
    return;
  }
  const confirmar = globalThis.confirm;
  if (typeof confirmar === 'function' && !confirmar('Limpar todos os itens do pedido?')) {
    return;
  }
  estado.carrinho = limparCarrinho();
  estado.avisoFinalizar = '';
  renderizar();
}

function tratarAtalhoPdv(evento) {
  if (!estado?.aberto) {
    return;
  }
  if (estado.vendaEstorno) {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      if (!estado.estornando) {
        fecharModalEstorno();
      }
    }
    return;
  }
  if (modalPagamentoEstaAberto()) {
    return;
  }

  if (evento.key === 'Escape') {
    evento.preventDefault();
    tentarLimparCarrinhoPorEsc();
    return;
  }

  if (evento.key === 'F1') {
    evento.preventDefault();
    containerAtual?.querySelector?.('#pdv-busca')?.focus?.();
    return;
  }

  const indiceCategoria = indiceCategoriaPorTecla(evento.key);
  if (indiceCategoria !== undefined) {
    evento.preventDefault();
    selecionarCategoriaPorIndice(indiceCategoria);
    return;
  }

  if (evento.key === 'F10') {
    evento.preventDefault();
    tentarAbrirPagamento();
    return;
  }

  if (enterAdicionaDaBusca(evento)) {
    evento.preventDefault();
    estado.busca = String(evento.target?.value || '').trim();
    carregarCatalogo()
      .then(async () => {
        const produto = estado.produtos[0];
        if (!produto) {
          await renderizar();
          return;
        }
        estado.carrinho = adicionarAoCarrinho(estado.carrinho, produto);
        estado.ultimaVenda = null;
        estado.erroVenda = '';
        estado.avisoFinalizar = '';
        await renderizar();
      })
      .catch(() => {});
    return;
  }

  if (setasNavegamPelaGrade(evento)) {
    if (!evento.defaultPrevented) {
      navegacaoGrade?.tratarTecla?.(evento);
    }
    return;
  }

  if (deveRoubarTeclaDeEdicao(evento)) {
    return;
  }

  if (evento.key === 'Delete') {
    evento.preventDefault();
    estado.carrinho = removerUltimoDoCarrinho(estado.carrinho);
    renderizar();
    return;
  }
}

function tentarAbrirPagamento() {
  if (!estado?.aberto) {
    return;
  }
  if (!estado.carrinho.length || totalLocal(estado.carrinho) <= 0) {
    estado.avisoFinalizar = 'Adicione itens ao carrinho para finalizar a venda.';
    const aviso = containerAtual?.querySelector?.('#pdv-aviso-finalizar');
    if (aviso) {
      aviso.textContent = estado.avisoFinalizar;
    } else {
      renderizar();
    }
    return;
  }
  estado.avisoFinalizar = '';
  const aviso = containerAtual?.querySelector?.('#pdv-aviso-finalizar');
  if (aviso) {
    aviso.textContent = '';
  }
  abrirModalPagamento({
    renderizarConteudo: (conteudo) => preencherConteudoPagamento(conteudo),
    aoFechar: aoFecharModalPagamento,
  });
}

function aoFecharModalPagamento() {
  resetarEstadoPagamento();
}

function preencherConteudoPagamento(conteudo) {
  if (!conteudo || !estado) {
    return;
  }
  conteudo.innerHTML = htmlSeletorFormaPagamento({
    formaPagamento: estado.formaPagamento,
    recebido: estado.recebido,
    itens: estado.carrinho,
    erro: estado.erroVenda,
  });
  ligarEventosPagamento(conteudo);
  if (estado.formaPagamento === 'dinheiro') {
    conteudo.querySelector('#pdv-recebido')?.focus?.();
  } else {
    conteudo.querySelector('#pdv-pagamento')?.focus?.();
  }
}

function ligarEventosPagamento(container) {
  for (const botao of container.querySelectorAll?.('[data-forma]') || []) {
    botao.addEventListener('click', () => {
      selecionarForma(botao.getAttribute('data-forma'));
    });
  }

  container.querySelector('#pdv-recebido')?.addEventListener('input', (evento) => {
    estado.recebido = evento.target?.value ?? '';
    atualizarTrocoNoDom(container, {
      recebido: estado.recebido,
      itens: estado.carrinho,
      formaPagamento: estado.formaPagamento,
    });
    const botao = container.querySelector('#btn-confirmar-venda');
    if (botao) {
      botao.disabled = !podeConfirmarVenda({
        itens: estado.carrinho,
        formaPagamento: estado.formaPagamento,
        recebido: estado.recebido,
      });
    }
  });

  container.querySelector('#btn-cancelar-pagamento')?.addEventListener('click', () => {
    fecharModalPagamento();
  });

  container.querySelector('#btn-confirmar-venda')?.addEventListener('click', async () => {
    await confirmarVenda();
  });

  container.querySelector('#pdv-pagamento')?.addEventListener('keydown', (evento) => {
    tratarAtalhoPagamento(evento, container);
  });
}

function selecionarForma(forma) {
  if (!forma || !estado) {
    return;
  }
  estado.formaPagamento = forma;
  if (forma !== 'dinheiro') {
    estado.recebido = '';
  }
  estado.erroVenda = '';
  if (modalPagamentoEstaAberto()) {
    const conteudo = globalThis.document?.getElementById?.('pdv-pagamento-conteudo-modal');
    if (conteudo) {
      preencherConteudoPagamento(conteudo);
    }
  }
}

function tratarAtalhoPagamento(evento, container) {
  const noRecebido = evento.target?.id === 'pdv-recebido';

  if (evento.key === 'Enter') {
    const botao = container.querySelector('#btn-confirmar-venda');
    if (botao && !botao.disabled) {
      evento.preventDefault();
      confirmarVenda();
    }
    return;
  }

  if (noRecebido) {
    return;
  }

  const indice = ATALHOS_FORMA_PAGAMENTO.findIndex((_, i) => evento.key === String(i + 1));
  if (indice < 0) {
    return;
  }
  evento.preventDefault();
  selecionarForma(ATALHOS_FORMA_PAGAMENTO[indice]);
}

async function confirmarVenda() {
  if (!estado || estado.confirmando) {
    return;
  }
  if (
    !podeConfirmarVenda({
      itens: estado.carrinho,
      formaPagamento: estado.formaPagamento,
      recebido: estado.recebido,
    })
  ) {
    return;
  }

  estado.confirmando = true;
  estado.erroVenda = '';
  try {
    const itensCupom = estado.carrinho.map((item) => ({ ...item }));
    const recebidoCupom = estado.recebido;
    const venda = await criarVenda({
      forma_pagamento: estado.formaPagamento,
      itens: estado.carrinho.map((item) => ({
        produto_id: item.produtoId,
        quantidade: item.quantidade,
      })),
    });
    estado.ultimaVenda = venda;
    estado.carrinho = limparCarrinho();
    resetarEstadoPagamento();
    estado.avisoFinalizar = '';
    fecharModalPagamento();
    await carregarVendasTurno();
    await renderizar();
    abrirCupomNaoFiscal({ venda, itens: itensCupom, recebido: recebidoCupom }).catch(() => {});
  } catch (erro) {
    estado.erroVenda = mensagemErroVenda(erro, estado.carrinho);
    if (erro?.codigo === 'CAIXA_FECHADO' || erro?.status === 403) {
      await getTurnoAtual({ forcar: true });
      estado.aberto = turnoEstaAberto();
      if (!estado.aberto) {
        fecharModalPagamento();
        await renderizar();
        return;
      }
    }
    if (modalPagamentoEstaAberto()) {
      const conteudo = globalThis.document?.getElementById?.('pdv-pagamento-conteudo-modal');
      if (conteudo) {
        preencherConteudoPagamento(conteudo);
      }
    } else {
      await renderizar();
    }
  } finally {
    estado.confirmando = false;
  }
}

async function carregarVendasTurno() {
  if (!estado) {
    return;
  }
  const turnoId = obterTurnoId();
  if (!turnoId) {
    estado.vendasTurno = [];
    estado.erroVendas = '';
    return;
  }
  try {
    const resultado = await listarVendas({ turno_id: turnoId, limit: 20 });
    estado.vendasTurno = resultado?.data || [];
    estado.erroVendas = '';
  } catch {
    estado.vendasTurno = [];
    estado.erroVendas = 'Não foi possível carregar as vendas deste turno.';
  }
}

function ligarEventosEstorno(container) {
  for (const botao of container.querySelectorAll?.('[data-estornar-venda]') || []) {
    botao.addEventListener('click', () => {
      const id = Number(botao.getAttribute('data-estornar-venda'));
      const venda = estado?.vendasTurno?.find((item) => Number(item.id) === id);
      if (!venda || venda.status === 'cancelada' || !ehAdmin()) {
        return;
      }
      estado.vendaEstorno = venda;
      estado.motivoEstorno = '';
      estado.erroEstorno = '';
      estado.estornando = false;
      renderizar();
    });
  }

  container.querySelector('#pdv-estorno-motivo')?.addEventListener('input', (evento) => {
    estado.motivoEstorno = evento.target?.value ?? '';
  });

  container.querySelector('#btn-cancelar-estorno-venda')?.addEventListener('click', () => {
    if (!estado?.estornando) {
      fecharModalEstorno();
    }
  });

  container.querySelector('#btn-confirmar-estorno-venda')?.addEventListener('click', () => {
    confirmarEstorno().catch(() => {});
  });
}

function fecharModalEstorno() {
  if (!estado) {
    return;
  }
  estado.vendaEstorno = null;
  estado.motivoEstorno = '';
  estado.erroEstorno = '';
  estado.estornando = false;
  renderizar();
}

async function confirmarEstorno() {
  if (!estado?.vendaEstorno || estado.estornando) {
    return;
  }
  const motivo = String(estado.motivoEstorno || '').trim();
  if (!motivo) {
    estado.erroEstorno = 'Informe o motivo do estorno.';
    await renderizar();
    return;
  }

  const vendaId = estado.vendaEstorno.id;
  estado.estornando = true;
  estado.erroEstorno = '';
  await renderizar();

  try {
    const resultado = await estornarVenda(vendaId, motivo);
    if (resultado?.tipo === 'correcao_pendente') {
      estado.estornando = false;
      estado.erroEstorno =
        'Esta venda é de um turno já fechado. O estorno ficou como correção pendente.';
      await renderizar();
      return;
    }
    if (estado.ultimaVenda && Number(estado.ultimaVenda.id) === Number(vendaId)) {
      estado.ultimaVenda = null;
    }
    estado.vendaEstorno = null;
    estado.motivoEstorno = '';
    estado.erroEstorno = '';
    estado.estornando = false;
    await carregarCatalogo();
    await carregarVendasTurno();
    await renderizar();
  } catch (erro) {
    estado.estornando = false;
    estado.erroEstorno = mensagemErroEstorno(erro);
    await renderizar();
  }
}
