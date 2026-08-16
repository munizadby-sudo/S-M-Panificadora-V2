import { temPermissao } from './session.js';

export function criarRouter() {
  const modulos = [];
  let moduloAtual = null;
  let containerMenu = null;
  let containerConteudo = null;

  function registrarModulo(modulo) {
    validarModulo(modulo);
    if (modulos.some((item) => item.id === modulo.id)) {
      throw new Error(`Módulo já registrado: ${modulo.id}`);
    }
    modulos.push(modulo);
  }

  function listarModulosPermitidos() {
    return modulos.filter((modulo) => temPermissao(modulo.permissao));
  }

  function obterModuloAtual() {
    return moduloAtual;
  }

  async function iniciar({ menu, conteudo, moduloInicial } = {}) {
    containerMenu = menu || null;
    containerConteudo = conteudo || null;
    renderizarMenu();

    const permitidos = listarModulosPermitidos();
    const destino = permitidos.find((modulo) => modulo.id === moduloInicial) ?? permitidos[0];
    if (destino) {
      await navegarPara(destino.id);
      return;
    }

    if (containerConteudo) {
      containerConteudo.innerHTML = '<p class="estado-vazio">Nenhum módulo disponível.</p>';
    }
  }

  async function navegarPara(id) {
    const modulo = listarModulosPermitidos().find((item) => item.id === id);
    if (!modulo) {
      return;
    }

    if (moduloAtual?.id === id) {
      return;
    }

    if (moduloAtual) {
      moduloAtual.desmontar?.();
      moduloAtual = null;
    }

    if (containerConteudo) {
      containerConteudo.innerHTML = '';
    }

    await modulo.montar(containerConteudo);
    moduloAtual = modulo;
    destacarModuloAtivo(id);
  }

  function renderizarMenu() {
    if (!containerMenu) {
      return;
    }

    containerMenu.innerHTML = '';
    const permitidos = listarModulosPermitidos();

    for (const modulo of permitidos) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.dataset.moduloId = modulo.id;
      botao.textContent = modulo.label;
      botao.addEventListener('click', () => {
        navegarPara(modulo.id);
      });
      containerMenu.appendChild(botao);
    }
  }

  function destacarModuloAtivo(id) {
    if (!containerMenu?.querySelectorAll) {
      return;
    }

    const botoes = containerMenu.querySelectorAll('[data-modulo-id]');
    for (const botao of botoes) {
      botao.classList.toggle('ativo', botao.dataset.moduloId === id);
    }
  }

  return {
    registrarModulo,
    listarModulosPermitidos,
    obterModuloAtual,
    iniciar,
    navegarPara,
  };
}

function validarModulo(modulo) {
  if (!modulo || typeof modulo !== 'object') {
    throw new Error('Módulo inválido');
  }
  if (!modulo.id || !modulo.label) {
    throw new Error('Módulo inválido: id e label são obrigatórios');
  }
  if (typeof modulo.montar !== 'function') {
    throw new Error(`Módulo inválido: ${modulo.id} precisa exportar montar()`);
  }
}
