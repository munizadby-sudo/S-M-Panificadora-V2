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
} from './api.js';
import { dataHoje, escapar } from './html.js';
import { htmlFormularioEncomenda } from './formulario.js';
import { htmlFiltrosEncomendas, htmlTabelaEncomendas } from './lista.js';
import { htmlModalCancelamento } from './modal-cancelamento.js';
import { adicionarItem, removerItem } from './itens.js';
import { validarFormularioEncomenda } from './validacao.js';

export { htmlTabelaEncomendas, htmlFiltrosEncomendas } from './lista.js';
export { htmlFormularioEncomenda } from './formulario.js';

let containerAtual;
let estado;
let timerBuscaProdutoItem;
let seletorCliente;

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
    await recarregar();
  },
  desmontar() {
    if (timerBuscaProdutoItem) {
      clearTimeout(timerBuscaProdutoItem);
      timerBuscaProdutoItem = undefined;
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

function renderizar() {
  const container = containerAtual;
  if (!container) {
    return;
  }

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
      <div id="lista-encomendas">${htmlTabelaEncomendas(estado.itensLista)}</div>
      ${formulario}
      ${htmlModalCancelamento({ encomenda: estado.cancelamentoModal, erro: estado.erroCancelamento })}
    </section>
  `;

  if (estado.mostrarFormulario) {
    montarSeletorClienteNoFormulario(container);
  }

  ligarEventos(container);
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

  container.querySelector('#perda-busca-produto')?.addEventListener('input', (evento) => {
    estado.formulario.buscaProdutoItem = evento.target.value;
    agendarBuscaProdutoItem();
  });

  for (const botao of container.querySelectorAll?.('.perdas-item-produto') || []) {
    botao.addEventListener('click', () => {
      estado.formulario.produtoItem = {
        id: Number(botao.getAttribute('data-produto-id')),
        nome: botao.getAttribute('data-produto-nome'),
      };
      estado.formulario.buscaProdutoItem = estado.formulario.produtoItem.nome;
      estado.resultadosProdutoItem = [];
      renderizar();
    });
  }

  container.querySelector('#perda-limpar-produto')?.addEventListener('click', () => {
    estado.formulario.produtoItem = null;
    estado.formulario.buscaProdutoItem = '';
    estado.resultadosProdutoItem = [];
    renderizar();
  });

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

  for (const select of container.querySelectorAll?.('[data-status-encomenda]') || []) {
    select.addEventListener('change', async (evento) => {
      const id = Number(select.getAttribute('data-status-encomenda'));
      await alterarStatus(id, evento.target.value);
    });
  }

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
    renderizar();
    return;
  }

  try {
    const resposta = await listarProdutos({ busca: termo, ativo: 1, limit: 8 });
    estado.resultadosProdutoItem = resposta.data || [];
  } catch {
    estado.resultadosProdutoItem = [];
  }
  renderizar();
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
