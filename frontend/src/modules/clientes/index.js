import {
  atualizarCliente,
  criarCliente,
  desativarCliente,
  listarClientes,
  mensagemErroCliente,
  reativarCliente,
} from './api.js';
import { htmlTabelaClientes } from './lista.js';
import { aplicarErroSalvarCliente, htmlModalCliente } from './modal-cliente.js';
import { montarSeletorCliente } from './seletor-cliente.js';
import { validarCliente } from './validacao.js';
import { escapar } from './html.js';

export { htmlTabelaClientes } from './lista.js';
export { htmlModalCliente, aplicarErroSalvarCliente } from './modal-cliente.js';
export { htmlSeletorCliente, montarSeletorCliente } from './seletor-cliente.js';

let containerAtual;
let estado;
let seletorDemo;

export default {
  id: 'clientes',
  label: 'Clientes',
  icone: 'ti-users',
  permissao: 'clientes',
  async montar(container) {
    if (!container) {
      return;
    }
    containerAtual = container;
    estado = estadoInicial();
    await recarregar();
  },
  desmontar() {
    seletorDemo?.destruir();
    seletorDemo = undefined;
    containerAtual = undefined;
    estado = undefined;
  },
};

function estadoInicial() {
  return {
    busca: '',
    mostrarInativos: false,
    clientes: [],
    erroClientes: '',
    modalCliente: null,
    demoSeletorCliente: null,
  };
}

async function recarregar() {
  await carregarClientes();
  renderizar();
}

async function carregarClientes() {
  try {
    estado.erroClientes = '';
    const resposta = await listarClientes({
      busca: estado.busca || undefined,
      ativo: estado.mostrarInativos ? undefined : 1,
    });
    estado.clientes = resposta.data || [];
  } catch (erro) {
    estado.clientes = [];
    estado.erroClientes = mensagemErroCliente(erro);
  }
}

function renderizar() {
  const container = containerAtual;
  if (!container) {
    return;
  }

  const modal = estado.modalCliente
    ? htmlModalCliente({
        cliente: estado.modalCliente.cliente,
        erro: estado.modalCliente.erro,
        errosCampos: estado.modalCliente.errosCampos,
      })
    : '';

  container.innerHTML = `
    <section class="clientes">
      <h1>Clientes</h1>
      <form id="form-filtro-clientes" class="clientes-filtros">
        <label>Busca
          <input type="search" id="busca-clientes" name="busca" value="${escapar(estado.busca)}" placeholder="Nome ou telefone">
        </label>
        <label class="clientes-toggle">
          <span class="clientes-toggle-texto">
            <span class="clientes-toggle-titulo">Mostrar inativos</span>
            <span class="clientes-toggle-ajuda">Clientes desativados</span>
          </span>
          <input type="checkbox" id="mostrar-inativos-clientes" class="clientes-toggle-input"${estado.mostrarInativos ? ' checked' : ''}>
          <span class="clientes-toggle-pista" aria-hidden="true"></span>
        </label>
        <button type="submit">Filtrar</button>
        <button type="button" id="btn-novo-cliente">Novo cliente</button>
      </form>
      <p id="clientes-erro" class="clientes-erro" role="alert">${escapar(estado.erroClientes)}</p>
      <div id="lista-clientes">${htmlTabelaClientes(estado.clientes, { acoes: true })}</div>
      <details class="clientes-seletor-demo">
        <summary>Seletor de cliente (componente reaproveitável)</summary>
        <p class="clientes-seletor-ajuda">Usado por Encomendas — busque, selecione ou cadastre sem sair do formulário que o chamou.</p>
        <div id="demo-seletor-cliente"></div>
        <p class="clientes-seletor-selecionado" id="demo-seletor-cliente-selecionado">${textoClienteSelecionado(estado.demoSeletorCliente)}</p>
      </details>
      ${modal}
    </section>
  `;

  montarSeletorDemo(container);
  ligarEventos(container);
}

function textoClienteSelecionado(cliente) {
  if (!cliente) {
    return 'Nenhum cliente selecionado.';
  }
  return `Selecionado: ${cliente.nome} — ${cliente.telefone}`;
}

function montarSeletorDemo(container) {
  seletorDemo?.destruir();
  const alvo = container.querySelector('#demo-seletor-cliente');
  if (!alvo) {
    return;
  }
  seletorDemo = montarSeletorCliente(alvo, {
    clienteInicial: estado.demoSeletorCliente,
    onSelecionar: (cliente) => {
      estado.demoSeletorCliente = cliente;
      const rotulo = container.querySelector('#demo-seletor-cliente-selecionado');
      if (rotulo) {
        rotulo.textContent = textoClienteSelecionado(cliente);
      }
    },
  });
}

function ligarEventos(container) {
  container.querySelector('#form-filtro-clientes')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    estado.busca = container.querySelector('#busca-clientes')?.value?.trim() || '';
    estado.mostrarInativos = Boolean(container.querySelector('#mostrar-inativos-clientes')?.checked);
    await recarregar();
  });

  container.querySelector('#mostrar-inativos-clientes')?.addEventListener('change', async (evento) => {
    estado.mostrarInativos = Boolean(evento.target?.checked);
    await recarregar();
  });

  container.querySelector('#btn-novo-cliente')?.addEventListener('click', () => {
    estado.modalCliente = { aberto: true, cliente: {}, erro: '', errosCampos: {} };
    renderizar();
  });

  for (const botao of container.querySelectorAll?.('[data-editar-cliente]') || []) {
    botao.addEventListener('click', () => {
      const id = String(botao.getAttribute('data-editar-cliente'));
      const cliente = estado.clientes.find((item) => String(item.id) === id) || { id };
      estado.modalCliente = { aberto: true, cliente: { ...cliente }, erro: '', errosCampos: {} };
      renderizar();
    });
  }

  container.querySelector('#btn-cancelar-cliente')?.addEventListener('click', () => {
    estado.modalCliente = null;
    renderizar();
  });

  container.querySelector('#form-cliente')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await salvarClienteDoModal(container);
  });

  for (const botao of container.querySelectorAll?.('[data-desativar-cliente]') || []) {
    botao.addEventListener('click', async () => {
      const id = botao.getAttribute('data-desativar-cliente');
      if (typeof globalThis.confirm === 'function' && !globalThis.confirm('Desativar este cliente?')) {
        return;
      }
      try {
        estado.erroClientes = '';
        await desativarCliente(id);
        await recarregar();
      } catch (erro) {
        estado.erroClientes = mensagemErroCliente(erro);
        renderizar();
      }
    });
  }

  for (const botao of container.querySelectorAll?.('[data-reativar-cliente]') || []) {
    botao.addEventListener('click', async () => {
      const id = botao.getAttribute('data-reativar-cliente');
      try {
        estado.erroClientes = '';
        await reativarCliente(id);
        await recarregar();
      } catch (erro) {
        estado.erroClientes = mensagemErroCliente(erro);
        renderizar();
      }
    });
  }
}

async function salvarClienteDoModal(container) {
  const modal = estado.modalCliente;
  if (!modal) {
    return;
  }

  const entrada = {
    nome: container.querySelector('#cliente-nome')?.value,
    telefone: container.querySelector('#cliente-telefone')?.value,
  };

  const validacao = validarCliente(entrada);
  if (!validacao.ok) {
    modal.aberto = true;
    modal.cliente = { ...modal.cliente, ...entrada };
    modal.erro = '';
    modal.errosCampos = validacao.erros;
    renderizar();
    return;
  }

  const payload = {
    nome: validacao.valores.nome,
    telefone: validacao.valores.telefone,
  };

  try {
    const id = modal.cliente?.id;
    if (id) {
      await atualizarCliente(id, payload);
    } else {
      await criarCliente(payload);
    }
    estado.modalCliente = null;
    await recarregar();
  } catch (erro) {
    modal.cliente = { ...modal.cliente, ...entrada };
    aplicarErroSalvarCliente(modal, erro);
    renderizar();
  }
}
