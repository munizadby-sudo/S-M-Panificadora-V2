import { listarProdutos } from '../produtos/api.js';
import { listarEstoque } from '../estoque/api.js';
import { criarProducao, listarProducao, mensagemErroProducao } from './api.js';
import { dataHoje, escapar } from './html.js';
import { htmlFormularioProducao } from './formulario.js';
import { htmlFiltrosProducao, htmlTabelaProducao } from './lista.js';
import { validarFormularioProducao } from './validacao.js';

export { htmlTabelaProducao, htmlFiltrosProducao } from './lista.js';
export { htmlFormularioProducao } from './formulario.js';

let containerAtual;
let estado;
let timerBuscaProduto;

export default {
  id: 'producao',
  label: 'Produção',
  icone: 'ti-chef-hat',
  permissao: 'producao',
  async montar(container) {
    if (!container) {
      return;
    }
    containerAtual = container;
    estado = estadoInicial();
    await recarregar();
  },
  desmontar() {
    if (timerBuscaProduto) {
      clearTimeout(timerBuscaProduto);
      timerBuscaProduto = undefined;
    }
    containerAtual = undefined;
    estado = undefined;
  },
};

function estadoInicial() {
  return {
    filtros: {
      dataInicio: '',
      dataFim: '',
      produtoId: '',
    },
    produtos: [],
    itens: [],
    erro: '',
    mostrarFormulario: false,
    formulario: formularioVazio(),
    resultadosProduto: [],
    errosCampos: {},
    erroFormulario: '',
    confirmacao: null,
  };
}

function formularioVazio() {
  return {
    buscaProduto: '',
    produto: null,
    quantidade: '',
    data: dataHoje(),
  };
}

async function recarregar() {
  await Promise.all([carregarProdutos(), carregarProducao()]);
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

async function carregarProducao() {
  try {
    estado.erro = '';
    const { filtros } = estado;
    const resposta = await listarProducao({
      data_inicio: filtros.dataInicio || undefined,
      data_fim: filtros.dataFim || undefined,
      produto_id: filtros.produtoId || undefined,
    });
    estado.itens = resposta.data || [];
  } catch (erro) {
    estado.itens = [];
    estado.erro = mensagemErroProducao(erro);
  }
}

function renderizar() {
  const container = containerAtual;
  if (!container) {
    return;
  }

  const formulario = estado.mostrarFormulario
    ? htmlFormularioProducao({
        formulario: estado.formulario,
        resultadosProduto: estado.resultadosProduto,
        errosCampos: estado.errosCampos,
        erro: estado.erroFormulario,
        confirmacao: estado.confirmacao,
      })
    : '';

  const botaoLancar = estado.mostrarFormulario
    ? ''
    : '<button type="button" id="btn-abrir-form-producao">Lançar produção</button>';

  container.innerHTML = `
    <section class="producao">
      <h1>Produção</h1>
      ${htmlFiltrosProducao({ filtros: estado.filtros, produtos: estado.produtos })}
      <div class="producao-acoes-topo">${botaoLancar}</div>
      <p id="producao-erro-lista" class="producao-erro" role="alert">${escapar(estado.erro)}</p>
      <div id="lista-producao">${htmlTabelaProducao(estado.itens)}</div>
      ${formulario}
    </section>
  `;

  ligarEventos(container);
}

function ligarEventos(container) {
  container.querySelector('#form-filtro-producao')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    estado.filtros.dataInicio = container.querySelector('#producao-data-inicio')?.value || '';
    estado.filtros.dataFim = container.querySelector('#producao-data-fim')?.value || '';
    estado.filtros.produtoId = container.querySelector('#producao-filtro-produto')?.value || '';
    await carregarProducao();
    renderizar();
  });

  container.querySelector('#btn-abrir-form-producao')?.addEventListener('click', () => {
    estado.mostrarFormulario = true;
    estado.confirmacao = null;
    estado.formulario = formularioVazio();
    estado.errosCampos = {};
    estado.erroFormulario = '';
    estado.resultadosProduto = [];
    renderizar();
  });

  container.querySelector('#btn-cancelar-producao')?.addEventListener('click', () => {
    estado.mostrarFormulario = false;
    estado.confirmacao = null;
    estado.formulario = formularioVazio();
    renderizar();
  });

  container.querySelector('#modal-form-producao')?.addEventListener('click', (evento) => {
    if (evento.target?.id !== 'modal-form-producao') {
      return;
    }
    estado.mostrarFormulario = false;
    estado.confirmacao = null;
    estado.formulario = formularioVazio();
    renderizar();
  });

  container.querySelector('#btn-fechar-confirmacao-producao')?.addEventListener('click', () => {
    estado.confirmacao = null;
    estado.formulario = formularioVazio();
    estado.errosCampos = {};
    estado.erroFormulario = '';
    renderizar();
  });

  container.querySelector('#form-producao')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await salvarProducao(container);
  });

  container.querySelector('#perda-busca-produto')?.addEventListener('input', (evento) => {
    estado.formulario.buscaProduto = evento.target.value;
    agendarBuscaProduto();
  });

  for (const botao of container.querySelectorAll?.('.perdas-item-produto') || []) {
    botao.addEventListener('click', () => {
      estado.formulario.produto = {
        id: Number(botao.getAttribute('data-produto-id')),
        nome: botao.getAttribute('data-produto-nome'),
      };
      estado.formulario.buscaProduto = estado.formulario.produto.nome;
      estado.resultadosProduto = [];
      estado.errosCampos = { ...estado.errosCampos, produto: '' };
      renderizar();
    });
  }

  container.querySelector('#perda-limpar-produto')?.addEventListener('click', () => {
    estado.formulario.produto = null;
    estado.formulario.buscaProduto = '';
    estado.resultadosProduto = [];
    renderizar();
  });

  container.querySelector('#producao-quantidade')?.addEventListener('input', (evento) => {
    estado.formulario.quantidade = evento.target.value;
  });

  container.querySelector('#producao-data')?.addEventListener('change', (evento) => {
    estado.formulario.data = evento.target.value;
  });
}

function agendarBuscaProduto() {
  if (timerBuscaProduto) {
    clearTimeout(timerBuscaProduto);
  }
  timerBuscaProduto = setTimeout(async () => {
    await buscarProdutos();
  }, 250);
}

async function buscarProdutos() {
  const termo = estado.formulario.buscaProduto?.trim();
  if (!termo || estado.formulario.produto) {
    estado.resultadosProduto = [];
    renderizar();
    return;
  }

  try {
    const resposta = await listarProdutos({ busca: termo, ativo: 1, limit: 8 });
    estado.resultadosProduto = resposta.data || [];
  } catch {
    estado.resultadosProduto = [];
  }
  renderizar();
}

async function salvarProducao(container) {
  estado.formulario.quantidade = container.querySelector('#producao-quantidade')?.value ?? '';
  estado.formulario.data = container.querySelector('#producao-data')?.value ?? '';

  const validacao = validarFormularioProducao({
    produtoId: estado.formulario.produto?.id,
    quantidade: estado.formulario.quantidade,
    data: estado.formulario.data,
  });

  if (!validacao.ok) {
    estado.errosCampos = validacao.erros;
    estado.erroFormulario = '';
    renderizar();
    return;
  }

  try {
    estado.erroFormulario = '';
    estado.errosCampos = {};
    const producao = await criarProducao(validacao.valores);
    const estoque = await listarEstoque({
      produto_id: producao.produto_id,
      data: producao.data,
      limit: 1,
    });
    const disponivel = estoque.data?.[0]?.disponivel ?? null;
    estado.confirmacao = { producao, disponivel };
    await carregarProducao();
    renderizar();
  } catch (erro) {
    estado.erroFormulario = mensagemErroProducao(erro);
    renderizar();
  }
}
