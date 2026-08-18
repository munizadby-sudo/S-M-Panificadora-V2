import { getUsuario } from '../../core/session.js';
import {
  atualizarProduto,
  criarCategoria,
  criarProduto,
  desativarCategoria,
  desativarProduto,
  listarCategorias,
  listarProdutos,
  mensagemErroCategoria,
  mensagemErroProduto,
  reativarCategoria,
  reativarProduto,
} from './api.js';
import { htmlPainelCategorias, montarSeletorCategoria } from './categorias.js';
import { htmlTabelaProdutos } from './lista.js';
import { aplicarErroSalvarProduto, htmlModalProduto } from './modal-produto.js';
import { validarProduto } from './validacao.js';
import { escapar } from './html.js';

export { htmlTabelaProdutos } from './lista.js';

let containerAtual;
let estado;

export default {
  id: 'produtos',
  label: 'Produtos',
  icone: 'ti-bread',
  permissao: 'produtos',
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
    mostrarInativos: false,
    categorias: [],
    categoriasAtivas: [],
    produtos: [],
    erroProdutos: '',
    erroCategorias: '',
    modalProduto: null,
  };
}

function podeDesativar() {
  return getUsuario()?.role === 'admin';
}

async function recarregar() {
  const [categoriasAtivas, categorias] = await Promise.all([
    carregarCategorias(1),
    carregarCategorias(estado.mostrarInativos ? undefined : 1),
  ]);
  estado.categoriasAtivas = categoriasAtivas;
  estado.categorias = categorias;
  await carregarProdutos();
  renderizar();
}

async function carregarCategorias(ativo) {
  try {
    const resposta = await listarCategorias({ ativo });
    return resposta.data || [];
  } catch {
    return [];
  }
}

async function carregarProdutos() {
  try {
    estado.erroProdutos = '';
    const resposta = await listarProdutos({
      busca: estado.busca || undefined,
      categoria_id: estado.categoriaId || undefined,
      ativo: estado.mostrarInativos ? undefined : 1,
    });
    estado.produtos = resposta.data || [];
  } catch (erro) {
    estado.produtos = [];
    estado.erroProdutos = mensagemErroProduto(erro);
  }
}

function renderizar() {
  const container = containerAtual;
  if (!container) {
    return;
  }

  const modal = estado.modalProduto
    ? htmlModalProduto({
        produto: estado.modalProduto.produto,
        erro: estado.modalProduto.erro,
        errosCampos: estado.modalProduto.errosCampos,
      })
    : '';

  container.innerHTML = `
    <section class="produtos">
      <h1>Produtos</h1>
      <form id="form-filtro-produtos" class="produtos-filtros">
        <label>Busca <input type="search" id="busca-produtos" name="busca" value="${escapar(estado.busca)}" placeholder="Nome do produto"></label>
        <label>Categoria <select id="filtro-categoria" name="categoria_id"></select></label>
        <label class="produtos-toggle">
          <span class="produtos-toggle-texto">
            <span class="produtos-toggle-titulo">Mostrar inativos</span>
            <span class="produtos-toggle-ajuda">Produtos e categorias desativados</span>
          </span>
          <input type="checkbox" id="mostrar-inativos" class="produtos-toggle-input"${estado.mostrarInativos ? ' checked' : ''}>
          <span class="produtos-toggle-pista" aria-hidden="true"></span>
        </label>
        <button type="submit">Filtrar</button>
        <button type="button" id="btn-novo-produto">Novo produto</button>
      </form>
      <p id="produtos-erro" class="produtos-erro" role="alert">${escapar(estado.erroProdutos)}</p>
      <div id="lista-produtos">${htmlTabelaProdutos(estado.produtos, estado.categorias, {
        acoes: true,
        podeDesativar: podeDesativar(),
      })}</div>
      ${htmlPainelCategorias(estado.categorias, { podeDesativar: podeDesativar(), erro: estado.erroCategorias })}
      ${modal}
    </section>
  `;

  montarSeletorCategoria(container.querySelector('#filtro-categoria'), estado.categorias, {
    incluirTodos: true,
    rotuloTodos: 'Todas',
    valor: estado.categoriaId,
  });

  if (estado.modalProduto) {
    montarSeletorCategoria(container.querySelector('#produto-categoria'), estado.categoriasAtivas, {
      valor: estado.modalProduto.produto?.categoria_id || '',
    });
  }

  ligarEventos(container);
}

function ligarEventos(container) {
  container.querySelector('#form-filtro-produtos')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    estado.busca = container.querySelector('#busca-produtos')?.value?.trim() || '';
    estado.categoriaId = container.querySelector('#filtro-categoria')?.value || '';
    estado.mostrarInativos = Boolean(container.querySelector('#mostrar-inativos')?.checked);
    await recarregar();
  });

  container.querySelector('#mostrar-inativos')?.addEventListener('change', async (evento) => {
    estado.mostrarInativos = Boolean(evento.target?.checked);
    await recarregar();
  });

  container.querySelector('#btn-novo-produto')?.addEventListener('click', () => {
    estado.modalProduto = { aberto: true, produto: {}, erro: '', errosCampos: {} };
    renderizar();
  });

  for (const botao of container.querySelectorAll?.('[data-editar-produto]') || []) {
    botao.addEventListener('click', () => {
      const id = String(botao.getAttribute('data-editar-produto'));
      const produto = estado.produtos.find((item) => String(item.id) === id) || { id };
      estado.modalProduto = { aberto: true, produto: { ...produto }, erro: '', errosCampos: {} };
      renderizar();
    });
  }

  container.querySelector('#btn-cancelar-produto')?.addEventListener('click', () => {
    estado.modalProduto = null;
    renderizar();
  });

  container.querySelector('#form-produto')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await salvarProdutoDoModal(container);
  });

  container.querySelector('#form-nova-categoria')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nome = container.querySelector('#nome-categoria')?.value?.trim();
    try {
      estado.erroCategorias = '';
      await criarCategoria({ nome });
      await recarregar();
    } catch (erro) {
      estado.erroCategorias = mensagemErroCategoria(erro);
      renderizar();
    }
  });

  for (const botao of container.querySelectorAll?.('[data-desativar-produto]') || []) {
    botao.addEventListener('click', async () => {
      const id = botao.getAttribute('data-desativar-produto');
      if (typeof globalThis.confirm === 'function' && !globalThis.confirm('Desativar este produto?')) {
        return;
      }
      try {
        estado.erroProdutos = '';
        await desativarProduto(id);
        await recarregar();
      } catch (erro) {
        estado.erroProdutos = mensagemErroProduto(erro);
        renderizar();
      }
    });
  }

  for (const botao of container.querySelectorAll?.('[data-reativar-produto]') || []) {
    botao.addEventListener('click', async () => {
      const id = botao.getAttribute('data-reativar-produto');
      try {
        estado.erroProdutos = '';
        await reativarProduto(id);
        await recarregar();
      } catch (erro) {
        estado.erroProdutos = mensagemErroProduto(erro);
        renderizar();
      }
    });
  }

  for (const botao of container.querySelectorAll?.('[data-desativar-categoria]') || []) {
    botao.addEventListener('click', async () => {
      const id = botao.getAttribute('data-desativar-categoria');
      if (typeof globalThis.confirm === 'function' && !globalThis.confirm('Desativar esta categoria?')) {
        return;
      }
      try {
        estado.erroCategorias = '';
        await desativarCategoria(id);
        await recarregar();
      } catch (erro) {
        estado.erroCategorias = mensagemErroCategoria(erro);
        renderizar();
      }
    });
  }

  for (const botao of container.querySelectorAll?.('[data-reativar-categoria]') || []) {
    botao.addEventListener('click', async () => {
      const id = botao.getAttribute('data-reativar-categoria');
      try {
        estado.erroCategorias = '';
        await reativarCategoria(id);
        await recarregar();
      } catch (erro) {
        estado.erroCategorias = mensagemErroCategoria(erro);
        renderizar();
      }
    });
  }
}

async function salvarProdutoDoModal(container) {
  const modal = estado.modalProduto;
  if (!modal) {
    return;
  }

  const entrada = {
    nome: container.querySelector('#produto-nome')?.value,
    categoria_id: container.querySelector('#produto-categoria')?.value,
    preco: container.querySelector('#produto-preco')?.value,
    custo: container.querySelector('#produto-custo')?.value,
    icone: container.querySelector('#produto-icone')?.value,
  };

  const validacao = validarProduto(entrada);
  if (!validacao.ok) {
    modal.aberto = true;
    modal.produto = { ...modal.produto, ...entrada };
    modal.erro = '';
    modal.errosCampos = validacao.erros;
    renderizar();
    return;
  }

  const payload = {
    nome: validacao.valores.nome,
    categoria_id: validacao.valores.categoria_id,
    preco: validacao.valores.preco,
    custo: validacao.valores.custo,
    icone: String(entrada.icone || '').trim() || null,
  };

  try {
    const id = modal.produto?.id;
    if (id) {
      await atualizarProduto(id, payload);
    } else {
      await criarProduto(payload);
    }
    estado.modalProduto = null;
    await recarregar();
  } catch (erro) {
    modal.produto = { ...modal.produto, ...entrada };
    aplicarErroSalvarProduto(modal, erro);
    renderizar();
  }
}
