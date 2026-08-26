import { debounce } from '../../core/utils.js';
import { criarCliente, listarClientes, mensagemErroCliente } from './api.js';
import { escapar } from './html.js';
import { aplicarErroSalvarCliente, htmlModalCliente } from './modal-cliente.js';
import { validarCliente } from './validacao.js';

export function htmlSeletorCliente({
  prefixo = 'seletor-cliente',
  busca = '',
  cliente = null,
  resultados = [],
  erro = '',
  mostrarCadastroRapido = false,
  modalCadastro = null,
} = {}) {
  const lista =
    Array.isArray(resultados) && resultados.length > 0 && !cliente
      ? `<ul class="clientes-resultados-seletor" id="${escapar(prefixo)}-resultados">
          ${resultados
            .map(
              (item) =>
                `<li><button type="button" class="clientes-item-seletor" data-cliente-id="${escapar(item.id)}" data-cliente-nome="${escapar(item.nome)}" data-cliente-telefone="${escapar(item.telefone)}">${escapar(item.nome)} — ${escapar(item.telefone)}</button></li>`,
            )
            .join('')}
        </ul>`
      : '';

  const selecionado = cliente
    ? `<p class="clientes-seletor-selecionado">Selecionado: <strong>${escapar(cliente.nome)}</strong> (${escapar(cliente.telefone)})</p>`
    : '';

  const cadastroRapido =
    !cliente && mostrarCadastroRapido
      ? `<p class="clientes-cadastro-rapido"><button type="button" id="${escapar(prefixo)}-cadastrar-novo">Cliente não encontrado? Cadastrar novo</button></p>`
      : '';

  const modal =
    modalCadastro != null
      ? htmlModalCliente({
          cliente: modalCadastro.cliente || {},
          erro: modalCadastro.erro || '',
          errosCampos: modalCadastro.errosCampos || {},
          idPrefixo: `${prefixo}-cadastro`,
          tituloNovo: 'Cadastrar cliente',
          tituloEditar: 'Cadastrar cliente',
          formId: `${prefixo}-form-cadastro`,
          cancelarId: `${prefixo}-cancelar-cadastro`,
        })
      : '';

  return `<div class="clientes-seletor" data-seletor-prefixo="${escapar(prefixo)}">
    <label>Cliente
      <input type="search" id="${escapar(prefixo)}-busca" name="busca_cliente" value="${escapar(busca)}" placeholder="Buscar por nome ou telefone..." autocomplete="off"${cliente ? ' disabled' : ''}>
      <input type="hidden" id="${escapar(prefixo)}-id" name="cliente_id" value="${escapar(cliente?.id ?? '')}">
    </label>
    <p class="campo-erro" id="${escapar(prefixo)}-erro">${escapar(erro || '')}</p>
    ${selecionado}
    ${lista}
    ${cadastroRapido}
    ${cliente ? `<button type="button" id="${escapar(prefixo)}-limpar">Trocar cliente</button>` : ''}
    ${modal}
  </div>`;
}

export function montarSeletorCliente(container, { onSelecionar, clienteInicial = null, prefixo = 'seletor-cliente' } = {}) {
  if (!container) {
    return { obterCliente: () => null, definirCliente: () => {}, destruir: () => {} };
  }

  let estado = {
    prefixo,
    busca: clienteInicial?.nome || '',
    cliente: clienteInicial,
    resultados: [],
    erro: '',
    mostrarCadastroRapido: false,
    modalCadastro: null,
  };

  let cancelarBusca = null;

  function capturarScroll() {
    return {
      janela: Number(globalThis.scrollY ?? globalThis.pageYOffset ?? 0) || 0,
      corpo: container.closest?.('.form-modal-corpo')?.scrollTop,
      overlay: container.closest?.('.encomendas-modal')?.scrollTop,
    };
  }

  function restaurarScroll(snap) {
    const corpo = container.closest?.('.form-modal-corpo');
    const overlay = container.closest?.('.encomendas-modal');
    if (corpo && Number.isFinite(Number(snap?.corpo))) {
      corpo.scrollTop = snap.corpo;
    }
    if (overlay && Number.isFinite(Number(snap?.overlay))) {
      overlay.scrollTop = snap.overlay;
    }
    if (typeof globalThis.scrollTo === 'function') {
      globalThis.scrollTo(0, snap?.janela || 0);
    }
  }

  function renderizar({ restaurarBusca = false } = {}) {
    const snap = capturarScroll();

    container.innerHTML = htmlSeletorCliente(estado);
    ligarEventos();
    restaurarScroll(snap);
    globalThis.requestAnimationFrame?.(() => restaurarScroll(snap));

    if (restaurarBusca && !estado.cliente) {
      const busca = container.querySelector(`#${estado.prefixo}-busca`);
      if (busca && !busca.disabled) {
        busca.focus?.({ preventScroll: true });
        const fim = String(busca.value || '').length;
        busca.setSelectionRange?.(fim, fim);
      }
    }
  }

  const buscarDebounced = debounce(async () => {
    await buscarClientes();
  }, 250);

  async function buscarClientes() {
    const termo = estado.busca?.trim();
    if (!termo || estado.cliente) {
      estado.resultados = [];
      estado.mostrarCadastroRapido = false;
      renderizar({ restaurarBusca: true });
      return;
    }

    try {
      estado.erro = '';
      const resposta = await listarClientes({ busca: termo, ativo: 1, limit: 10 });
      estado.resultados = resposta.data || [];
      estado.mostrarCadastroRapido = estado.resultados.length === 0;
    } catch (erro) {
      estado.resultados = [];
      estado.mostrarCadastroRapido = true;
      estado.erro = mensagemErroCliente(erro);
    }
    renderizar({ restaurarBusca: true });
  }

  function selecionarCliente(cliente) {
    estado.cliente = cliente;
    estado.busca = cliente.nome;
    estado.resultados = [];
    estado.mostrarCadastroRapido = false;
    estado.modalCadastro = null;
    estado.erro = '';
    renderizar();
    onSelecionar?.(cliente);
  }

  async function salvarCadastroRapido() {
    const entrada = {
      nome: container.querySelector(`#${estado.prefixo}-cadastro-nome`)?.value,
      telefone: container.querySelector(`#${estado.prefixo}-cadastro-telefone`)?.value,
    };

    const validacao = validarCliente(entrada);
    if (!validacao.ok) {
      estado.modalCadastro = {
        cliente: { ...entrada },
        erro: '',
        errosCampos: validacao.erros,
      };
      renderizar();
      return;
    }

    try {
      const salvo = await criarCliente({
        nome: validacao.valores.nome,
        telefone: validacao.valores.telefone,
      });
      estado.modalCadastro = null;
      selecionarCliente(salvo);
    } catch (erro) {
      const modal = { aberto: true, cliente: { ...entrada }, erro: '', errosCampos: {} };
      aplicarErroSalvarCliente(modal, erro);
      estado.modalCadastro = modal;
      renderizar();
    }
  }

  function ligarEventos() {
    container.querySelector(`#${estado.prefixo}-busca`)?.addEventListener('input', (evento) => {
      estado.busca = evento.target.value;
      estado.mostrarCadastroRapido = false;
      buscarDebounced();
    });

    for (const botao of container.querySelectorAll?.('.clientes-item-seletor') || []) {
      botao.addEventListener('mousedown', (evento) => {
        evento?.preventDefault?.();
      });
      botao.addEventListener('click', () => {
        selecionarCliente({
          id: Number(botao.getAttribute('data-cliente-id')),
          nome: botao.getAttribute('data-cliente-nome'),
          telefone: botao.getAttribute('data-cliente-telefone'),
        });
      });
    }

    container.querySelector(`#${estado.prefixo}-limpar`)?.addEventListener('click', () => {
      estado.cliente = null;
      estado.busca = '';
      estado.resultados = [];
      estado.mostrarCadastroRapido = false;
      estado.modalCadastro = null;
      renderizar({ restaurarBusca: true });
      onSelecionar?.(null);
    });

    container.querySelector(`#${estado.prefixo}-cadastrar-novo`)?.addEventListener('click', () => {
      const telefoneSugerido = /^\d[\d\s()-]*$/.test(estado.busca?.trim() || '') ? estado.busca.trim() : '';
      estado.modalCadastro = {
        cliente: { nome: '', telefone: telefoneSugerido },
        erro: '',
        errosCampos: {},
      };
      renderizar();
    });

    container.querySelector(`#${estado.prefixo}-cancelar-cadastro`)?.addEventListener('click', () => {
      estado.modalCadastro = null;
      renderizar();
    });

    container.querySelector(`#${estado.prefixo}-form-cadastro`)?.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      await salvarCadastroRapido();
    });
  }

  renderizar();

  return {
    obterCliente() {
      return estado.cliente;
    },
    definirCliente(cliente) {
      estado.cliente = cliente;
      estado.busca = cliente?.nome || '';
      estado.resultados = [];
      estado.mostrarCadastroRapido = false;
      estado.modalCadastro = null;
      renderizar();
    },
    destruir() {
      if (cancelarBusca) {
        clearTimeout(cancelarBusca);
      }
      container.innerHTML = '';
    },
  };
}
