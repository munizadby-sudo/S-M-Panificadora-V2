import { debounce } from '../../core/utils.js';
import { getTurnoAtual, onMudancaDeTurno, turnoEstaAberto } from '../caixa-turno/estado.js';
import { listarCategorias, listarProdutos, mensagemErroProduto } from '../produtos/api.js';
import { montarSeletorCategoria } from '../produtos/categorias.js';
import { htmlAvisoCaixaFechado } from './aviso.js';
import { htmlGradeProdutos } from './grade.js';
import { ligarNavegacaoGrade } from './navegacao-grade.js';
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
import { htmlConfirmacaoVenda } from './confirmacao.js';
import { criarVenda, mensagemErroVenda } from './api.js';

let containerAtual;
let estado;
let cancelarTurno;
let buscarDebounced;
let listenerF10;

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
      }
      renderizar().catch(() => {});
    });
    listenerF10 = (evento) => {
      if (evento.key !== 'F10') {
        return;
      }
      if (!estado?.aberto) {
        return;
      }
      evento.preventDefault();
      tentarAbrirPagamento();
    };
    globalThis.document?.addEventListener?.('keydown', listenerF10);
    await renderizar();
  },
  desmontar() {
    cancelarTurno?.();
    cancelarTurno = undefined;
    if (listenerF10) {
      globalThis.document?.removeEventListener?.('keydown', listenerF10);
      listenerF10 = undefined;
    }
    fecharModalPagamento();
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

async function renderizar() {
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

  container.innerHTML = `
    <section class="pdv">
      <h1>Vendas</h1>
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
        </div>
      </div>
    </section>
  `;

  montarSeletorCategoria(container.querySelector('#pdv-categoria'), estado.categorias, {
    incluirTodos: true,
    rotuloTodos: 'Todas',
    valor: estado.categoriaId,
  });
  ligarEventos(container);

  if (modalPagamentoEstaAberto()) {
    abrirModalPagamento({
      renderizarConteudo: (conteudo) => preencherConteudoPagamento(conteudo),
      aoFechar: aoFecharModalPagamento,
    });
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
        busca: estado.busca || undefined,
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

function ligarEventos(container) {
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
    estado.busca = evento.target?.value?.trim() || '';
    buscarDebounced();
  });

  container.querySelector('#pdv-categoria')?.addEventListener('change', async (evento) => {
    estado.categoriaId = evento.target?.value || '';
    await carregarCatalogo();
    await renderizar();
  });

  for (const botao of container.querySelectorAll?.('[data-adicionar-produto]') || []) {
    botao.addEventListener('click', () => {
      const id = Number(botao.getAttribute('data-adicionar-produto'));
      const produto = estado.produtos.find((item) => Number(item.id) === id);
      if (!produto) {
        return;
      }
      estado.carrinho = adicionarAoCarrinho(estado.carrinho, produto);
      estado.ultimaVenda = null;
      estado.erroVenda = '';
      estado.avisoFinalizar = '';
      renderizar();
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

  ligarNavegacaoGrade(container.querySelector('#pdv-grade-itens'), {
    aoAtivar(card) {
      card.click();
    },
  });
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

  const indice = ['1', '2', '3'].indexOf(evento.key);
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
    await renderizar();
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
