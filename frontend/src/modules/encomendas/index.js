import { ehAdmin } from '../../core/session.js';
import { listarProdutos } from '../produtos/api.js';
import { montarSeletorCliente } from '../clientes/seletor-cliente.js';
import {
  buscarEncomenda,
  cancelarEncomenda,
  criarEncomenda,
  listarEncomendas,
  mensagemErroEncomenda,
  mudarStatusEncomenda,
  atualizarEncomenda,
  finalizarEncomenda,
} from './api.js';
import { dataHoje, escapar } from './html.js';
import { htmlFormularioEncomenda, produtoComPrecoNoCusto } from './formulario.js';
import { htmlSeletorProduto } from '../perdas/seletor-produto.js';
import { htmlFiltrosEncomendas, htmlTabelaEncomendas } from './lista.js';
import { htmlModalCancelamento } from './modal-cancelamento.js';
import { htmlModalFinalizarEncomenda, saldoAReceber, formaPeloAtalho } from './modal-finalizar.js';
import { adicionarItem, removerItem } from './itens.js';
import { validarFormularioEncomenda } from './validacao.js';

export { htmlTabelaEncomendas, htmlFiltrosEncomendas } from './lista.js';
export { htmlFormularioEncomenda } from './formulario.js';

let containerAtual;
let estado;
let timerBuscaProdutoItem;
let seletorCliente;
let listenerAtalhosFinalizar;

export default {
  id: 'encomendas',
  label: 'Encomendas',
  icone: 'ti-clipboard-list',
  permissao: 'encomendas',
  async montar(container) {
    if (!container) {
      return;
    }
    containerAtual = container;
    estado = estadoInicial();
    listenerAtalhosFinalizar = (evento) => tratarAtalhoFinalizar(evento);
    globalThis.document?.addEventListener?.('keydown', listenerAtalhosFinalizar);
    await recarregar();
  },
  desmontar() {
    if (timerBuscaProdutoItem) {
      clearTimeout(timerBuscaProdutoItem);
      timerBuscaProdutoItem = undefined;
    }
    if (listenerAtalhosFinalizar) {
      globalThis.document?.removeEventListener?.('keydown', listenerAtalhosFinalizar);
      listenerAtalhosFinalizar = undefined;
    }
    seletorCliente?.destruir();
    seletorCliente = undefined;
    containerAtual = undefined;
    estado = undefined;
  },
};

function estadoInicial() {
  return {
    filtros: { status: '', dataEntregaInicio: '', dataEntregaFim: '', ativo: '1' },
    produtos: [],
    itensLista: [],
    erro: '',
    mostrarFormulario: false,
    edicaoId: null,
    formulario: formularioVazio(),
    resultadosProdutoItem: [],
    errosCampos: {},
    erroFormulario: '',
    cancelamentoModal: null,
    erroCancelamento: '',
    finalizarModal: null,
    formaFinalizar: '',
    erroFinalizar: '',
  };
}

function formularioVazio() {
  return {
    cliente: null,
    clienteNome: '',
    clienteTelefone: '',
    dataEntrega: dataHoje(),
    sinal: '',
    observacoes: '',
    buscaProdutoItem: '',
    produtoItem: null,
    quantidadeItem: '',
    itens: [],
  };
}

async function recarregar() {
  await Promise.all([carregarProdutos(), carregarEncomendas()]);
  renderizar();
}

async function carregarProdutos() {
  try {
    const resposta = await listarProdutos({ ativo: 1, limit: 200 });
    estado.produtos = resposta.data || [];
  } catch {
    estado.produtos = [];
  }
}

async function carregarEncomendas() {
  try {
    estado.erro = '';
    const { filtros } = estado;
    const resposta = await listarEncomendas({
      status: filtros.status || undefined,
      data_entrega_inicio: filtros.dataEntregaInicio || undefined,
      data_entrega_fim: filtros.dataEntregaFim || undefined,
      ativo: filtros.ativo,
    });
    estado.itensLista = resposta.data || [];
  } catch (erro) {
    estado.itensLista = [];
    estado.erro = mensagemErroEncomenda(erro);
  }
}

function capturarScrollModal(container) {
  return {
    janela: Number(globalThis.scrollY ?? globalThis.pageYOffset ?? 0) || 0,
    corpo: container?.querySelector?.('.form-modal-corpo')?.scrollTop,
    overlay: container?.querySelector?.('.encomendas-modal')?.scrollTop,
  };
}

function restaurarScrollModal(container, snap) {
  if (!container || !snap) {
    return;
  }
  const corpo = container.querySelector?.('.form-modal-corpo');
  const overlay = container.querySelector?.('.encomendas-modal');
  if (corpo && Number.isFinite(Number(snap.corpo))) {
    corpo.scrollTop = snap.corpo;
  }
  if (overlay && Number.isFinite(Number(snap.overlay))) {
    overlay.scrollTop = snap.overlay;
  }
  if (typeof globalThis.scrollTo === 'function') {
    globalThis.scrollTo(0, snap.janela);
  }
}

function htmlSeletorProdutoItem() {
  return htmlSeletorProduto({
    busca: estado.formulario.buscaProdutoItem,
    produto: produtoComPrecoNoCusto(estado.formulario.produtoItem),
    resultados: (estado.resultadosProdutoItem || []).map(produtoComPrecoNoCusto),
    erro: '',
  });
}

function atualizarSeletorProdutoItem({ restaurarBusca = false } = {}) {
  const container = containerAtual;
  const alvo = container?.querySelector('#encomenda-item-seletor');
  if (!alvo) {
    renderizar();
    return;
  }

  const snap = capturarScrollModal(container);
  alvo.innerHTML = htmlSeletorProdutoItem();
  ligarEventosSeletorProduto(container);
  restaurarScrollModal(container, snap);
  globalThis.requestAnimationFrame?.(() => restaurarScrollModal(container, snap));

  if (restaurarBusca && !estado.formulario.produtoItem) {
    const busca = container.querySelector('#perda-busca-produto');
    if (busca && !busca.disabled) {
      busca.focus?.({ preventScroll: true });
      const fim = String(busca.value || '').length;
      busca.setSelectionRange?.(fim, fim);
    }
  }
}

function renderizar() {
  const container = containerAtual;
  if (!container) {
    return;
  }

  const snap = capturarScrollModal(container);

  const formulario = estado.mostrarFormulario
    ? htmlFormularioEncomenda({
        formulario: estado.formulario,
        resultadosProdutoItem: estado.resultadosProdutoItem,
        errosCampos: estado.errosCampos,
        erro: estado.erroFormulario,
        edicao: estado.edicaoId != null,
      })
    : '';

  const botaoNova = estado.mostrarFormulario
    ? ''
    : '<button type="button" id="btn-abrir-form-encomenda">Nova encomenda</button>';

  container.innerHTML = `
    <section class="encomendas">
      <h1>Encomendas</h1>
      ${htmlFiltrosEncomendas({ filtros: estado.filtros })}
      <div class="encomendas-acoes-topo">${botaoNova}</div>
      <p id="encomendas-erro-lista" class="encomendas-erro" role="alert">${escapar(estado.erro)}</p>
      <div id="lista-encomendas">${htmlTabelaEncomendas(estado.itensLista, { admin: ehAdmin() })}</div>
      ${formulario}
      ${htmlModalCancelamento({ encomenda: estado.cancelamentoModal, erro: estado.erroCancelamento })}
      ${htmlModalFinalizarEncomenda({
        encomenda: estado.finalizarModal,
        forma: estado.formaFinalizar,
        erro: estado.erroFinalizar,
      })}
    </section>
  `;

  if (estado.mostrarFormulario) {
    montarSeletorClienteNoFormulario(container);
  }

  ligarEventos(container);
  restaurarScrollModal(container, snap);
  globalThis.requestAnimationFrame?.(() => restaurarScrollModal(container, snap));

  if (estado.finalizarModal) {
    container.querySelector('#form-finalizar-encomenda')?.focus?.({ preventScroll: true });
  }
}

function montarSeletorClienteNoFormulario(container) {
  const alvo = container.querySelector('#encomenda-cliente-seletor');
  if (!alvo) {
    return;
  }
  seletorCliente = montarSeletorCliente(alvo, {
    prefixo: 'encomenda-cliente',
    clienteInicial: estado.formulario.cliente,
    onSelecionar: (cliente) => {
      estado.formulario.cliente = cliente;
      if (cliente) {
        estado.formulario.clienteNome = cliente.nome;
        estado.formulario.clienteTelefone = cliente.telefone;
        const nomeInput = containerAtual?.querySelector('#encomenda-cliente-nome');
        const telInput = containerAtual?.querySelector('#encomenda-cliente-telefone');
        if (nomeInput) nomeInput.value = cliente.nome;
        if (telInput) telInput.value = cliente.telefone;
      }
    },
  });
}

function ligarEventos(container) {
  container.querySelector('#form-filtro-encomendas')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    estado.filtros.status = container.querySelector('#encomendas-filtro-status')?.value || '';
    estado.filtros.dataEntregaInicio = container.querySelector('#encomendas-data-inicio')?.value || '';
    estado.filtros.dataEntregaFim = container.querySelector('#encomendas-data-fim')?.value || '';
    estado.filtros.ativo = container.querySelector('#encomendas-filtro-ativo')?.value ?? '1';
    await carregarEncomendas();
    renderizar();
  });

  container.querySelector('#btn-abrir-form-encomenda')?.addEventListener('click', () => {
    estado.mostrarFormulario = true;
    estado.edicaoId = null;
    estado.formulario = formularioVazio();
    estado.errosCampos = {};
    estado.erroFormulario = '';
    estado.resultadosProdutoItem = [];
    renderizar();
  });

  container.querySelector('#btn-cancelar-form-encomenda')?.addEventListener('click', () => {
    estado.mostrarFormulario = false;
    estado.edicaoId = null;
    estado.formulario = formularioVazio();
    renderizar();
  });

  container.querySelector('#modal-form-encomenda')?.addEventListener('click', (evento) => {
    if (evento.target?.id !== 'modal-form-encomenda') {
      return;
    }
    estado.mostrarFormulario = false;
    estado.edicaoId = null;
    estado.formulario = formularioVazio();
    renderizar();
  });

  container.querySelector('#form-encomenda')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await salvarEncomenda(container);
  });

  // campos simples: só sincroniza estado, nunca re-renderiza (evita perder foco a cada tecla)
  container.querySelector('#encomenda-cliente-nome')?.addEventListener('input', (evento) => {
    estado.formulario.clienteNome = evento.target.value;
  });
  container.querySelector('#encomenda-cliente-telefone')?.addEventListener('input', (evento) => {
    estado.formulario.clienteTelefone = evento.target.value;
  });
  container.querySelector('#encomenda-data-entrega')?.addEventListener('change', (evento) => {
    estado.formulario.dataEntrega = evento.target.value;
  });
  container.querySelector('#encomenda-sinal')?.addEventListener('input', (evento) => {
    estado.formulario.sinal = evento.target.value;
  });
  container.querySelector('#encomenda-observacoes')?.addEventListener('input', (evento) => {
    estado.formulario.observacoes = evento.target.value;
  });
  container.querySelector('#encomenda-item-quantidade')?.addEventListener('input', (evento) => {
    estado.formulario.quantidadeItem = evento.target.value;
  });

  ligarEventosSeletorProduto(container);

  container.querySelector('#btn-adicionar-item-encomenda')?.addEventListener('click', () => {
    if (!estado.formulario.produtoItem) {
      return;
    }
    const produtoCompleto = estado.produtos.find((p) => p.id === estado.formulario.produtoItem.id) || estado.formulario.produtoItem;
    estado.formulario.itens = adicionarItem(estado.formulario.itens, produtoCompleto, estado.formulario.quantidadeItem);
    estado.formulario.produtoItem = null;
    estado.formulario.buscaProdutoItem = '';
    estado.formulario.quantidadeItem = '';
    estado.resultadosProdutoItem = [];
    estado.errosCampos = { ...estado.errosCampos, itens: '' };
    renderizar();
  });

  for (const botao of container.querySelectorAll?.('[data-remover-item-encomenda]') || []) {
    botao.addEventListener('click', () => {
      const produtoId = Number(botao.getAttribute('data-remover-item-encomenda'));
      estado.formulario.itens = removerItem(estado.formulario.itens, produtoId);
      renderizar();
    });
  }

  for (const botao of container.querySelectorAll?.('[data-editar-encomenda]') || []) {
    botao.addEventListener('click', async () => {
      await abrirEdicao(Number(botao.getAttribute('data-editar-encomenda')));
    });
  }

  for (const botao of container.querySelectorAll?.('[data-avancar-status]') || []) {
    botao.addEventListener('click', async () => {
      await alterarStatus(Number(botao.getAttribute('data-avancar-status')), 'pronto');
    });
  }

  for (const botao of container.querySelectorAll?.('[data-finalizar-encomenda]') || []) {
    botao.addEventListener('click', () => {
      const id = Number(botao.getAttribute('data-finalizar-encomenda'));
      estado.finalizarModal = estado.itensLista.find((item) => Number(item.id) === id) || null;
      estado.formaFinalizar = '';
      estado.erroFinalizar = '';
      renderizar();
    });
  }

  for (const botao of container.querySelectorAll?.('[data-reabrir-encomenda]') || []) {
    botao.addEventListener('click', async () => {
      await alterarStatus(Number(botao.getAttribute('data-reabrir-encomenda')), 'pronto');
    });
  }

  for (const botao of container.querySelectorAll?.('[data-forma-encomenda]') || []) {
    botao.addEventListener('click', () => {
      estado.formaFinalizar = botao.getAttribute('data-forma-encomenda') || '';
      renderizar();
    });
  }

  container.querySelector('#btn-cancelar-finalizar-encomenda')?.addEventListener('click', () => {
    estado.finalizarModal = null;
    estado.formaFinalizar = '';
    estado.erroFinalizar = '';
    renderizar();
  });

  container.querySelector('#modal-finalizar-encomenda')?.addEventListener('click', (evento) => {
    if (evento.target?.id !== 'modal-finalizar-encomenda') {
      return;
    }
    estado.finalizarModal = null;
    estado.formaFinalizar = '';
    estado.erroFinalizar = '';
    renderizar();
  });

  container.querySelector('#form-finalizar-encomenda')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await confirmarFinalizar();
  });

  for (const botao of container.querySelectorAll?.('[data-cancelar-encomenda]') || []) {
    botao.addEventListener('click', () => {
      const id = Number(botao.getAttribute('data-cancelar-encomenda'));
      estado.cancelamentoModal = estado.itensLista.find((item) => Number(item.id) === id) || null;
      estado.erroCancelamento = '';
      renderizar();
    });
  }

  container.querySelector('#btn-cancelar-modal-encomenda')?.addEventListener('click', () => {
    estado.cancelamentoModal = null;
    estado.erroCancelamento = '';
    renderizar();
  });

  container.querySelector('#btn-confirmar-cancelamento-encomenda')?.addEventListener('click', async () => {
    await confirmarCancelamento();
  });
}

function ligarEventosSeletorProduto(container) {
  container.querySelector('#perda-busca-produto')?.addEventListener('input', (evento) => {
    estado.formulario.buscaProdutoItem = evento.target.value;
    agendarBuscaProdutoItem();
  });

  for (const botao of container.querySelectorAll?.('.perdas-item-produto') || []) {
    botao.addEventListener('mousedown', (evento) => {
      evento?.preventDefault?.();
    });
    botao.addEventListener('click', () => {
      const id = Number(botao.getAttribute('data-produto-id'));
      const catalogo = estado.produtos.find((p) => p.id === id);
      estado.formulario.produtoItem = {
        id,
        nome: botao.getAttribute('data-produto-nome'),
        custo: Number(botao.getAttribute('data-produto-custo')),
        preco: catalogo?.preco ?? Number(botao.getAttribute('data-produto-custo')),
      };
      estado.formulario.buscaProdutoItem = estado.formulario.produtoItem.nome;
      estado.resultadosProdutoItem = [];
      atualizarSeletorProdutoItem();
    });
  }

  container.querySelector('#perda-limpar-produto')?.addEventListener('click', () => {
    estado.formulario.produtoItem = null;
    estado.formulario.buscaProdutoItem = '';
    estado.resultadosProdutoItem = [];
    atualizarSeletorProdutoItem({ restaurarBusca: true });
  });
}

function agendarBuscaProdutoItem() {
  if (timerBuscaProdutoItem) {
    clearTimeout(timerBuscaProdutoItem);
  }
  timerBuscaProdutoItem = setTimeout(async () => {
    await buscarProdutosItem();
  }, 250);
}

async function buscarProdutosItem() {
  const termo = estado.formulario.buscaProdutoItem?.trim();
  if (!termo || estado.formulario.produtoItem) {
    estado.resultadosProdutoItem = [];
    atualizarSeletorProdutoItem({ restaurarBusca: true });
    return;
  }

  try {
    const resposta = await listarProdutos({ busca: termo, ativo: 1, limit: 8 });
    estado.resultadosProdutoItem = resposta.data || [];
  } catch {
    estado.resultadosProdutoItem = [];
  }
  atualizarSeletorProdutoItem({ restaurarBusca: true });
}

async function abrirEdicao(id) {
  try {
    const encomenda = await buscarEncomenda(id);
    estado.edicaoId = id;
    estado.mostrarFormulario = true;
    estado.errosCampos = {};
    estado.erroFormulario = '';
    estado.resultadosProdutoItem = [];
    estado.formulario = {
      cliente: encomenda.cliente_id ? { id: encomenda.cliente_id, nome: encomenda.cliente_nome, telefone: encomenda.cliente_telefone } : null,
      clienteNome: encomenda.cliente_nome,
      clienteTelefone: encomenda.cliente_telefone,
      dataEntrega: encomenda.data_entrega,
      sinal: encomenda.sinal,
      observacoes: encomenda.observacoes || '',
      buscaProdutoItem: '',
      produtoItem: null,
      quantidadeItem: '',
      itens: (encomenda.itens || []).map((item) => {
        const produto = estado.produtos.find((p) => p.id === item.produto_id);
        return {
          produtoId: item.produto_id,
          nome: produto?.nome || `Produto #${item.produto_id}`,
          precoUnitario: item.preco_unitario,
          quantidade: item.quantidade,
          subtotal: item.subtotal,
        };
      }),
    };
    renderizar();
  } catch (erro) {
    estado.erro = mensagemErroEncomenda(erro);
    renderizar();
  }
}

async function salvarEncomenda() {
  const validacao = validarFormularioEncomenda({
    clienteNome: estado.formulario.clienteNome,
    clienteTelefone: estado.formulario.clienteTelefone,
    dataEntrega: estado.formulario.dataEntrega,
    sinal: estado.formulario.sinal,
    itens: estado.formulario.itens,
  });

  if (!validacao.ok) {
    estado.errosCampos = validacao.erros;
    estado.erroFormulario = '';
    renderizar();
    return;
  }

  const entrada = { ...validacao.valores, cliente_id: estado.formulario.cliente?.id || undefined };

  try {
    estado.erroFormulario = '';
    estado.errosCampos = {};
    if (estado.edicaoId != null) {
      await atualizarEncomenda(estado.edicaoId, entrada);
    } else {
      await criarEncomenda(entrada);
    }
    estado.mostrarFormulario = false;
    estado.edicaoId = null;
    estado.formulario = formularioVazio();
    await carregarEncomendas();
    renderizar();
  } catch (erro) {
    estado.erroFormulario = mensagemErroEncomenda(erro);
    renderizar();
  }
}

async function alterarStatus(id, status) {
  try {
    await mudarStatusEncomenda(id, status);
    await carregarEncomendas();
    renderizar();
  } catch (erro) {
    estado.erro = mensagemErroEncomenda(erro);
    renderizar();
  }
}

function tratarAtalhoFinalizar(evento) {
  if (!estado?.finalizarModal) {
    return;
  }
  if (evento.key === 'Escape') {
    evento.preventDefault();
    estado.finalizarModal = null;
    estado.formaFinalizar = '';
    estado.erroFinalizar = '';
    renderizar();
    return;
  }
  const forma = formaPeloAtalho(evento.key);
  if (forma && saldoAReceber(estado.finalizarModal) > 0) {
    evento.preventDefault();
    if (estado.formaFinalizar === forma) {
      return;
    }
    estado.formaFinalizar = forma;
    renderizar();
    return;
  }
  if (evento.key !== 'Enter') {
    return;
  }
  if (evento.target?.closest?.('#form-finalizar-encomenda')) {
    return;
  }
  const saldo = saldoAReceber(estado.finalizarModal);
  if (saldo > 0 && !estado.formaFinalizar) {
    return;
  }
  evento.preventDefault();
  confirmarFinalizar();
}

async function confirmarFinalizar() {
  const encomenda = estado.finalizarModal;
  if (!encomenda) {
    return;
  }
  const saldo = saldoAReceber(encomenda);
  if (saldo > 0 && !estado.formaFinalizar) {
    estado.erroFinalizar = 'Escolha a forma de pagamento.';
    renderizar();
    return;
  }
  try {
    estado.erroFinalizar = '';
    await finalizarEncomenda(encomenda.id, { forma: estado.formaFinalizar });
    estado.finalizarModal = null;
    estado.formaFinalizar = '';
    await carregarEncomendas();
    renderizar();
  } catch (erro) {
    estado.erroFinalizar = mensagemErroEncomenda(erro);
    renderizar();
  }
}

async function confirmarCancelamento() {
  const encomenda = estado.cancelamentoModal;
  if (!encomenda) {
    return;
  }

  try {
    estado.erroCancelamento = '';
    await cancelarEncomenda(encomenda.id);
    estado.cancelamentoModal = null;
    await carregarEncomendas();
    renderizar();
  } catch (erro) {
    estado.erroCancelamento = mensagemErroEncomenda(erro);
    renderizar();
  }
}
