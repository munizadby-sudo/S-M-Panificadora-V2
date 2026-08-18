import { atualizarEstoque, atualizarEstoqueEmLote, listarEstoque, mensagemErroEstoque } from './api.js';
import { htmlTabelaEstoque } from './lista.js';
import { escapar } from './html.js';
import { aplicarErroSalvarEstoque, htmlModalEdicaoEstoque } from './modal-edicao.js';
import {
  aplicarErroLote,
  htmlTabelaLoteEstoque,
  lerLinhasLoteDoDom,
  ligarPreviaDisponivelLote,
  validarLinhasLote,
} from './tabela-lote.js';
import { validarLancamentoEstoque } from './validacao.js';
import { listarCategorias } from '../produtos/api.js';
import { montarSeletorCategoria } from '../produtos/categorias.js';

export { htmlTabelaEstoque } from './lista.js';

let containerAtual;
let estado;

export default {
  id: 'estoque',
  label: 'Estoque',
  icone: 'ti-boxes',
  permissao: 'estoque',
  async montar(container) {
    if (!container) {
      return;
    }
    containerAtual = container;
    estado = estadoInicial();
    await recarregar();
  },
  desmontar() {
    containerAtual = undefined;
    estado = undefined;
  },
};

function estadoInicial() {
  return {
    busca: '',
    categoriaId: '',
    categorias: [],
    itens: [],
    erro: '',
    data: '',
    modal: null,
    modoLote: false,
    lote: [],
    erroLote: '',
  };
}

async function recarregar() {
  await Promise.all([carregarCategorias(), carregarEstoque()]);
  renderizar();
}

async function carregarCategorias() {
  try {
    const resposta = await listarCategorias({ ativo: 1 });
    estado.categorias = resposta.data || [];
  } catch {
    estado.categorias = [];
  }
}

async function carregarEstoque() {
  try {
    estado.erro = '';
    const resposta = await listarEstoque({
      busca: estado.busca || undefined,
      categoria_id: estado.categoriaId || undefined,
    });
    estado.itens = resposta.data || [];
    estado.data = estado.itens[0]?.data || '';
  } catch (erro) {
    estado.itens = [];
    estado.erro = mensagemErroEstoque(erro);
  }
}

function renderizar() {
  const container = containerAtual;
  if (!container) {
    return;
  }

  const dataRotulo = estado.data ? ` — ${escapar(estado.data)}` : '';
  const modal = estado.modal && !estado.modoLote
    ? htmlModalEdicaoEstoque({
        item: estado.modal.item,
        erro: estado.modal.erro,
        errosCampos: estado.modal.errosCampos,
      })
    : '';
  const lista = estado.modoLote
    ? htmlTabelaLoteEstoque(estado.lote)
    : htmlTabelaEstoque(estado.itens, { acoes: true });
  const acoesLote = estado.modoLote
    ? `<button type="button" id="btn-salvar-lote">Salvar lote</button>
       <button type="button" id="btn-cancelar-lote">Cancelar</button>`
    : `<button type="button" id="btn-modo-lote">Lançamento em lote</button>`;
  container.innerHTML = `
    <section class="estoque">
      <h1>Estoque${dataRotulo}</h1>
      <form id="form-filtro-estoque" class="estoque-filtros">
        <label>Busca <input type="search" id="busca-estoque" name="busca" value="${escapar(estado.busca)}" placeholder="Nome do produto"></label>
        <label>Categoria <select id="filtro-categoria-estoque" name="categoria_id"></select></label>
        <button type="submit">Filtrar</button>
        ${acoesLote}
      </form>
      <p id="estoque-erro" class="estoque-erro" role="alert">${escapar(estado.erro)}</p>
      <p id="estoque-erro-lote" class="estoque-erro" role="alert">${escapar(estado.erroLote)}</p>
      <div id="lista-estoque">${lista}</div>
      ${modal}
    </section>
  `;

  montarSeletorCategoria(container.querySelector('#filtro-categoria-estoque'), estado.categorias, {
    incluirTodos: true,
    rotuloTodos: 'Todas',
    valor: estado.categoriaId,
  });

  ligarEventos(container);
}

function ligarEventos(container) {
  container.querySelector('#form-filtro-estoque')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    estado.busca = container.querySelector('#busca-estoque')?.value?.trim() || '';
    estado.categoriaId = container.querySelector('#filtro-categoria-estoque')?.value || '';
    estado.modoLote = false;
    estado.lote = [];
    estado.erroLote = '';
    await recarregar();
  });

  container.querySelector('#btn-modo-lote')?.addEventListener('click', () => {
    estado.modal = null;
    estado.modoLote = true;
    estado.erroLote = '';
    estado.lote = estado.itens.map((item) => ({ ...item, erro: '' }));
    renderizar();
  });

  container.querySelector('#btn-cancelar-lote')?.addEventListener('click', () => {
    estado.modoLote = false;
    estado.lote = [];
    estado.erroLote = '';
    renderizar();
  });

  container.querySelector('#btn-salvar-lote')?.addEventListener('click', async () => {
    await salvarLote(container);
  });

  for (const botao of container.querySelectorAll?.('[data-editar-estoque]') || []) {
    botao.addEventListener('click', () => {
      const id = String(botao.getAttribute('data-editar-estoque'));
      const item = estado.itens.find((linha) => String(linha.produto_id) === id);
      if (!item) {
        return;
      }
      estado.modal = { aberto: true, item: { ...item }, erro: '', errosCampos: {} };
      renderizar();
    });
  }

  container.querySelector('#btn-cancelar-estoque')?.addEventListener('click', () => {
    estado.modal = null;
    renderizar();
  });

  container.querySelector('#form-estoque')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await salvarEstoqueDoModal(container);
  });

  if (estado.modoLote) {
    ligarPreviaDisponivelLote(container, estado.lote);
  }
}

async function salvarEstoqueDoModal(container) {
  const modal = estado.modal;
  if (!modal) {
    return;
  }

  const entrada = {
    inicial: container.querySelector('#estoque-inicial')?.value,
    produzido: container.querySelector('#estoque-produzido')?.value,
    minimo: container.querySelector('#estoque-minimo')?.value,
  };

  const validacao = validarLancamentoEstoque(entrada);
  if (!validacao.ok) {
    modal.aberto = true;
    modal.item = { ...modal.item, ...entrada };
    modal.erro = '';
    modal.errosCampos = validacao.erros;
    renderizar();
    return;
  }

  try {
    await atualizarEstoque(modal.item.produto_id, {
      data: modal.item.data,
      inicial: validacao.valores.inicial,
      produzido: validacao.valores.produzido,
      minimo: validacao.valores.minimo,
    });
    estado.modal = null;
    await recarregar();
  } catch (erro) {
    modal.item = { ...modal.item, ...entrada };
    aplicarErroSalvarEstoque(modal, erro);
    renderizar();
  }
}

async function salvarLote(container) {
  estado.lote = lerLinhasLoteDoDom(container, estado.lote);
  const validacao = validarLinhasLote(estado.lote);
  estado.lote = validacao.linhas;
  if (!validacao.ok) {
    estado.erroLote = 'Nenhum item foi aplicado. Corrija a linha destacada.';
    renderizar();
    return;
  }

  const itens = validacao.linhas.map((item) => ({
    produto_id: item.produto_id,
    inicial: item.valores.inicial,
    produzido: item.valores.produzido,
    minimo: item.valores.minimo,
  }));

  try {
    estado.erroLote = '';
    await atualizarEstoqueEmLote({ data: estado.data, itens });
    estado.modoLote = false;
    estado.lote = [];
    await recarregar();
  } catch (erro) {
    estado.lote = aplicarErroLote(estado.lote, erro);
    estado.erroLote = mensagemErroEstoque(erro);
    renderizar();
  }
}



