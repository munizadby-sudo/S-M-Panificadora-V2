import {
  atualizarUsuario,
  criarUsuario,
  desativarUsuario,
  listarUsuarios,
  mensagemErroUsuario,
} from './api.js';
import { escapar } from './html.js';
import { htmlTabelaUsuarios } from './lista.js';
import {
  aplicarErroSalvarUsuario,
  htmlModalUsuario,
  ligarFeedbackSenha,
} from './modal-usuario.js';
import { htmlSeletorPermissoes } from './seletor-permissoes.js';
import { PERMISSOES_VALIDAS } from './permissoes.js';
import { validarUsuario } from './validacao.js';
import { getUsuario } from '../../core/session.js';

export { htmlTabelaUsuarios } from './lista.js';
export { htmlModalUsuario, aplicarErroSalvarUsuario, ligarFeedbackSenha } from './modal-usuario.js';
export { htmlSeletorPermissoes } from './seletor-permissoes.js';
export { PERMISSOES_VALIDAS, ROTULOS_PERMISSAO } from './permissoes.js';
export { mensagemErroUsuario } from './api.js';

let containerAtual;
let estado;

export default {
  id: 'usuarios',
  label: 'Usuários',
  icone: 'ti-user-cog',
  permissao: 'admin',
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
    usuarios: [],
    pagina: 1,
    erro: '',
    modalUsuario: null,
  };
}

async function recarregar() {
  try {
    estado.erro = '';
    const resposta = await listarUsuarios({ page: estado.pagina, limit: 50 });
    estado.usuarios = resposta.data || [];
  } catch (erro) {
    estado.usuarios = [];
    estado.erro = mensagemErroUsuario(erro);
  }
  renderizar();
}

function renderizar() {
  const container = containerAtual;
  if (!container || !estado) {
    return;
  }

  const usuarioLogadoId = getUsuario()?.id ?? null;
  const modal = estado.modalUsuario
    ? htmlModalUsuario({
        usuario: estado.modalUsuario.usuario,
        erro: estado.modalUsuario.erro,
        errosCampos: estado.modalUsuario.errosCampos,
      })
    : '';

  container.innerHTML = `
    <section class="usuarios">
      <h1>Usuários e Permissões</h1>
      <div class="usuarios-acoes-topo">
        <button type="button" id="btn-novo-usuario">Novo usuário</button>
      </div>
      <p id="usuarios-erro" class="usuarios-erro" role="alert">${escapar(estado.erro)}</p>
      <div id="lista-usuarios">${htmlTabelaUsuarios(estado.usuarios, { usuarioLogadoId })}</div>
      ${modal}
    </section>
  `;

  if (estado.modalUsuario) {
    ligarFeedbackSenha(container);
    ligarEventosModal(container);
  }
  ligarEventos(container);
}

function ligarEventos(container) {
  container.querySelector('#btn-novo-usuario')?.addEventListener('click', () => {
    estado.modalUsuario = {
      aberto: true,
      usuario: { role: 'operador', permissoes: [] },
      erro: '',
      errosCampos: {},
    };
    renderizar();
  });

  for (const botao of container.querySelectorAll?.('[data-editar-usuario]') || []) {
    botao.addEventListener('click', () => {
      const id = String(botao.getAttribute('data-editar-usuario'));
      const usuario = estado.usuarios.find((item) => String(item.id) === id) || { id };
      estado.modalUsuario = {
        aberto: true,
        usuario: { ...usuario },
        erro: '',
        errosCampos: {},
      };
      renderizar();
    });
  }

  for (const botao of container.querySelectorAll?.('[data-desativar-usuario]') || []) {
    botao.addEventListener('click', async () => {
      const id = botao.getAttribute('data-desativar-usuario');
      if (typeof globalThis.confirm === 'function' && !globalThis.confirm('Desativar este usuário?')) {
        return;
      }
      try {
        estado.erro = '';
        await desativarUsuario(id);
        await recarregar();
      } catch (erro) {
        estado.erro = mensagemErroUsuario(erro);
        renderizar();
      }
    });
  }
}

function ligarEventosModal(container) {
  container.querySelector('#btn-cancelar-usuario')?.addEventListener('click', () => {
    estado.modalUsuario = null;
    renderizar();
  });

  container.querySelector('#usuario-role')?.addEventListener('change', (evento) => {
    const modal = estado.modalUsuario;
    if (!modal) {
      return;
    }
    modal.usuario = {
      ...modal.usuario,
      nome: container.querySelector('#usuario-nome')?.value,
      username: container.querySelector('#usuario-username')?.value,
      role: evento.target.value,
      permissoes: lerPermissoesDoForm(container),
    };
    renderizar();
  });

  container.querySelector('#form-usuario')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await salvarUsuarioDoModal(container);
  });
}

function lerPermissoesDoForm(container) {
  return [...(container.querySelectorAll('input[name="permissoes"]:checked') || [])].map(
    (input) => input.value,
  );
}

async function salvarUsuarioDoModal(container) {
  const modal = estado.modalUsuario;
  if (!modal) {
    return;
  }

  const editando = Boolean(modal.usuario?.id);
  const role = container.querySelector('#usuario-role')?.value;
  const entrada = {
    nome: container.querySelector('#usuario-nome')?.value,
    username: container.querySelector('#usuario-username')?.value,
    senha: container.querySelector('#usuario-senha')?.value,
    role,
  };

  const validacao = validarUsuario({ ...entrada, editando });
  if (!validacao.ok) {
    modal.aberto = true;
    modal.usuario = { ...modal.usuario, ...entrada, permissoes: lerPermissoesDoForm(container) };
    modal.erro = '';
    modal.errosCampos = validacao.erros;
    renderizar();
    return;
  }

  const payload = {
    nome: validacao.valores.nome,
    username: validacao.valores.username,
    role: validacao.valores.role,
  };

  if (validacao.valores.senha) {
    payload.senha = validacao.valores.senha;
  }

  if (role === 'operador') {
    payload.permissoes = lerPermissoesDoForm(container);
  }

  try {
    const id = modal.usuario?.id;
    if (id) {
      await atualizarUsuario(id, payload);
    } else {
      await criarUsuario(payload);
    }
    estado.modalUsuario = null;
    await recarregar();
  } catch (erro) {
    modal.usuario = {
      ...modal.usuario,
      ...entrada,
      permissoes: role === 'operador' ? lerPermissoesDoForm(container) : [],
    };
    aplicarErroSalvarUsuario(modal, erro);
    renderizar();
  }
}
