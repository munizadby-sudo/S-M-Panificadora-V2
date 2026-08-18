import { getUsuario } from '../../core/session.js';
import { listarProdutos } from '../produtos/api.js';
import { listarEstoque } from '../estoque/api.js';
import { criarPerda, estornarPerda, listarPerdas, mensagemErroPerda } from './api.js';
import { dataHoje, escapar } from './html.js';
import { htmlFormularioPerda } from './formulario.js';
import { htmlFiltrosPerdas, htmlTabelaPerdas } from './lista.js';
import { htmlModalEstorno } from './modal-estorno.js';
import { calcularPreviaCusto, validarFormularioPerda } from './validacao.js';

export { htmlTabelaPerdas, htmlFiltrosPerdas } from './lista.js';
export { htmlFormularioPerda } from './formulario.js';
export { htmlModalEstorno } from './modal-estorno.js';
export { htmlSeletorProduto } from './seletor-produto.js';

let containerAtual;
let estado;
let timerBuscaProduto;

export default {
  id: 'perdas',
  label: 'Perdas',
  icone: 'ti-trash',
  permissao: 'perdas',
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
  const usuario = getUsuario();
  return {
    ehAdmin: usuario?.role === 'admin',
    filtros: {
      dataInicio: '',
      dataFim: '',
      produtoId: '',
      motivo: '',
      ativo: '1',
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
    estornoModal: null,
    erroEstorno: '',
  };
}

function formularioVazio() {
  return {
    buscaProduto: '',
    produto: null,
    quantidade: '',
    motivo: 'queimado',
    data: dataHoje(),
  };
}

async function recarregar() {
  await Promise.all([carregarProdutos(), carregarPerdas()]);
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

async function carregarPerdas() {
  try {
    estado.erro = '';
    const { filtros } = estado;
    const params = {
      data_inicio: filtros.dataInicio || undefined,
      data_fim: filtros.dataFim || undefined,
      produto_id: filtros.produtoId || undefined,
      motivo: filtros.motivo || undefined,
    };
    if (estado.ehAdmin && filtros.ativo !== '') {
      params.ativo = filtros.ativo;
    }
    const resposta = await listarPerdas(params);
    estado.itens = resposta.data || [];
  } catch (erro) {
    estado.itens = [];
    estado.erro = mensagemErroPerda(erro);
  }
}

function renderizar() {
  const container = containerAtual;
  if (!container) {
    return;
  }

  const formulario = estado.mostrarFormulario
    ? htmlFormularioPerda({
        formulario: estado.formulario,
        resultadosProduto: estado.resultadosProduto,
        previaCusto: calcularPreviaCusto(
          estado.formulario.produto,
          estado.formulario.quantidade,
        ),
        errosCampos: estado.errosCampos,
        erro: estado.erroFormulario,
        confirmacao: estado.confirmacao,
      })
    : '';

  const botaoRegistrar = estado.mostrarFormulario
    ? ''
    : '<button type="button" id="btn-abrir-form-perda">Registrar perda</button>';

  container.innerHTML = `
    <section class="perdas">
      <h1>Perdas</h1>
      ${htmlFiltrosPerdas({
        filtros: estado.filtros,
        produtos: estado.produtos,
        ehAdmin: estado.ehAdmin,
      })}
      <div class="perdas-acoes-topo">${botaoRegistrar}</div>
      <p id="perdas-erro-lista" class="perdas-erro" role="alert">${escapar(estado.erro)}</p>
      <div id="lista-perdas">${htmlTabelaPerdas(estado.itens, { ehAdmin: estado.ehAdmin })}</div>
      ${formulario}
      ${htmlModalEstorno({ perda: estado.estornoModal, erro: estado.erroEstorno })}
    </section>
  `;

  ligarEventos(container);
}

function ligarEventos(container) {
  container.querySelector('#form-filtro-perdas')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    estado.filtros.dataInicio = container.querySelector('#perdas-data-inicio')?.value || '';
    estado.filtros.dataFim = container.querySelector('#perdas-data-fim')?.value || '';
    estado.filtros.produtoId = container.querySelector('#perdas-filtro-produto')?.value || '';
    estado.filtros.motivo = container.querySelector('#perdas-filtro-motivo')?.value || '';
    if (estado.ehAdmin) {
      estado.filtros.ativo = container.querySelector('#perdas-filtro-ativo')?.value ?? '1';
    }
    await carregarPerdas();
    renderizar();
  });

  container.querySelector('#btn-abrir-form-perda')?.addEventListener('click', () => {
    estado.mostrarFormulario = true;
    estado.confirmacao = null;
    estado.formulario = formularioVazio();
    estado.errosCampos = {};
    estado.erroFormulario = '';
    estado.resultadosProduto = [];
    renderizar();
  });

  container.querySelector('#btn-cancelar-perda')?.addEventListener('click', () => {
    estado.mostrarFormulario = false;
    estado.confirmacao = null;
    estado.formulario = formularioVazio();
    renderizar();
  });

  container.querySelector('#btn-fechar-confirmacao')?.addEventListener('click', () => {
    estado.confirmacao = null;
    estado.formulario = formularioVazio();
    estado.errosCampos = {};
    estado.erroFormulario = '';
    renderizar();
  });

  container.querySelector('#form-perda')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await salvarPerda(container);
  });

  container.querySelector('#perda-busca-produto')?.addEventListener('input', (evento) => {
    estado.formulario.buscaProduto = evento.target.value;
    agendarBuscaProduto(container);
  });

  for (const botao of container.querySelectorAll?.('.perdas-item-produto') || []) {
    botao.addEventListener('click', () => {
      estado.formulario.produto = {
        id: Number(botao.getAttribute('data-produto-id')),
        nome: botao.getAttribute('data-produto-nome'),
        custo: Number(botao.getAttribute('data-produto-custo')),
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

  container.querySelector('#perda-quantidade')?.addEventListener('input', (evento) => {
    estado.formulario.quantidade = evento.target.value;
    atualizarPreviaNoDom(container);
  });

  container.querySelector('#perda-motivo')?.addEventListener('change', (evento) => {
    estado.formulario.motivo = evento.target.value;
  });

  container.querySelector('#perda-data')?.addEventListener('change', (evento) => {
    estado.formulario.data = evento.target.value;
  });

  for (const botao of container.querySelectorAll?.('[data-estornar-perda]') || []) {
    botao.addEventListener('click', () => {
      const id = Number(botao.getAttribute('data-estornar-perda'));
      estado.estornoModal = estado.itens.find((item) => Number(item.id) === id) || null;
      estado.erroEstorno = '';
      renderizar();
    });
  }

  container.querySelector('#btn-cancelar-estorno')?.addEventListener('click', () => {
    estado.estornoModal = null;
    estado.erroEstorno = '';
    renderizar();
  });

  container.querySelector('#btn-confirmar-estorno')?.addEventListener('click', async () => {
    await confirmarEstorno(container);
  });
}

function agendarBuscaProduto(container) {
  if (timerBuscaProduto) {
    clearTimeout(timerBuscaProduto);
  }
  timerBuscaProduto = setTimeout(async () => {
    await buscarProdutos(container);
  }, 250);
}

async function buscarProdutos(container) {
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

function atualizarPreviaNoDom(container) {
  const previa = calcularPreviaCusto(estado.formulario.produto, estado.formulario.quantidade);
  const bloco = container.querySelector('.perdas-previa-custo strong');
  if (bloco && previa != null) {
    bloco.textContent = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(previa);
  }
}

async function salvarPerda(container) {
  estado.formulario.quantidade = container.querySelector('#perda-quantidade')?.value ?? '';
  estado.formulario.motivo = container.querySelector('#perda-motivo')?.value ?? '';
  estado.formulario.data = container.querySelector('#perda-data')?.value ?? '';

  const validacao = validarFormularioPerda({
    produtoId: estado.formulario.produto?.id,
    quantidade: estado.formulario.quantidade,
    motivo: estado.formulario.motivo,
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
    const perda = await criarPerda(validacao.valores);
    const estoque = await listarEstoque({
      produto_id: perda.produto_id,
      data: perda.data,
      limit: 1,
    });
    const disponivel = estoque.data?.[0]?.disponivel ?? null;
    estado.confirmacao = { perda, disponivel };
    await carregarPerdas();
    renderizar();
  } catch (erro) {
    estado.erroFormulario = mensagemErroPerda(erro);
    renderizar();
  }
}

async function confirmarEstorno(container) {
  const perda = estado.estornoModal;
  if (!perda) {
    return;
  }

  try {
    estado.erroEstorno = '';
    await estornarPerda(perda.id);
    estado.estornoModal = null;
    await carregarPerdas();
    renderizar();
  } catch (erro) {
    estado.erroEstorno = mensagemErroPerda(erro);
    renderizar();
  }
}
