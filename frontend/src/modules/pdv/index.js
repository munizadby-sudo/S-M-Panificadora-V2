import { debounce } from '../../core/utils.js';
import { getTurnoAtual, onMudancaDeTurno, turnoEstaAberto } from '../caixa-turno/estado.js';
import { montarBanner } from '../caixa-turno/banner.js';
import { listarCategorias, listarProdutos, mensagemErroProduto } from '../produtos/api.js';
import { montarSeletorCategoria } from '../produtos/categorias.js';
import { htmlAvisoCaixaFechado, irParaTelaDeCaixa } from './aviso.js';
import { htmlGradeProdutos } from './grade.js';
import {
  adicionarAoCarrinho,
  htmlCarrinho,
  limparCarrinho,
  removerDoCarrinho,
  removerUltimoDoCarrinho,
} from './carrinho.js';
import { htmlSeletorFormaPagamento, atualizarTrocoNoDom } from './pagamento.js';
import { htmlConfirmacaoVenda } from './confirmacao.js';
import { criarVenda, mensagemErroVenda } from './api.js';

let containerAtual;
let estado;
let cancelarBanner;
let cancelarTurno;
let buscarDebounced;

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
      renderizar().catch(() => {});
    });
    await renderizar();
  },
  desmontar() {
    cancelarBanner?.();
    cancelarBanner = undefined;
    cancelarTurno?.();
    cancelarTurno = undefined;
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
    ultimaVenda: null,
    confirmando: false,
  };
}

async function renderizar() {
  const container = containerAtual;
  if (!container || !estado) {
    return;
  }
  cancelarBanner?.();

  if (!estado.aberto) {
    container.innerHTML = `
      <section class="pdv">
        <h1>Vendas</h1>
        <div id="pdv-banner" class="caixa-turno-banner" role="status"></div>
        ${htmlAvisoCaixaFechado()}
      </section>
    `;
    cancelarBanner = await montarBanner(container.querySelector('#pdv-banner'));
    container.querySelector('#btn-ir-para-caixa')?.addEventListener('click', () => {
      irParaTelaDeCaixa();
    });
    return;
  }

  if (!estado.produtos.length && !estado.erroGrade) {
    await carregarCatalogo();
  }

  container.innerHTML = `
    <section class="pdv">
      <h1>Vendas</h1>
      <div id="pdv-banner" class="caixa-turno-banner" role="status"></div>
      ${htmlConfirmacaoVenda(estado.ultimaVenda)}
      <div class="pdv-painel">
        ${htmlGradeProdutos({
          produtos: estado.produtos,
          busca: estado.busca,
          erro: estado.erroGrade,
        })}
        <div class="pdv-lateral">
          ${htmlCarrinho(estado.carrinho)}
          ${htmlSeletorFormaPagamento({
            formaPagamento: estado.formaPagamento,
            recebido: estado.recebido,
            itens: estado.carrinho,
            erro: estado.erroVenda,
          })}
        </div>
      </div>
    </section>
  `;

  cancelarBanner = await montarBanner(container.querySelector('#pdv-banner'));
  montarSeletorCategoria(container.querySelector('#pdv-categoria'), estado.categorias, {
    incluirTodos: true,
    rotuloTodos: 'Todas',
    valor: estado.categoriaId,
  });
  ligarEventos(container);
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

  for (const botao of container.querySelectorAll?.('[data-forma]') || []) {
    botao.addEventListener('click', () => {
      estado.formaPagamento = botao.getAttribute('data-forma');
      if (estado.formaPagamento !== 'dinheiro') {
        estado.recebido = '';
      }
      renderizar();
    });
  }

  container.querySelector('#pdv-recebido')?.addEventListener('input', (evento) => {
    estado.recebido = evento.target?.value ?? '';
    atualizarTrocoNoDom(container, {
      recebido: estado.recebido,
      itens: estado.carrinho,
      formaPagamento: estado.formaPagamento,
    });
  });

  container.querySelector('#btn-confirmar-venda')?.addEventListener('click', async () => {
    await confirmarVenda();
  });
}

async function confirmarVenda() {
  if (!estado || estado.confirmando) {
    return;
  }
  if (!estado.carrinho.length || !estado.formaPagamento) {
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
    estado.formaPagamento = '';
    estado.recebido = '';
    estado.erroVenda = '';
  } catch (erro) {
    estado.erroVenda = mensagemErroVenda(erro, estado.carrinho);
    if (erro?.codigo === 'CAIXA_FECHADO' || erro?.status === 403) {
      await getTurnoAtual({ forcar: true });
      estado.aberto = turnoEstaAberto();
    }
  } finally {
    estado.confirmando = false;
  }
  await renderizar();
}
