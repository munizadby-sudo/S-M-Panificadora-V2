import { temPermissao } from './session.js';

/** Operacionais sempre visíveis (SPEC-FE-015 §4). Demais módulos vão em "Mais ▾". */
export const IDS_OPERACIONAIS = new Set(['pdv', 'encomendas', 'estoque', 'fluxo']);

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
    const operacionais = permitidos.filter((modulo) => IDS_OPERACIONAIS.has(modulo.id));
    const administrativos = permitidos.filter((modulo) => !IDS_OPERACIONAIS.has(modulo.id));

    for (const modulo of operacionais) {
      containerMenu.appendChild(criarBotaoMenu(modulo));
    }

    if (administrativos.length > 0) {
      const select = document.createElement('select');
      select.className = 'menu-mais';
      select.setAttribute('aria-label', 'Mais módulos');

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Mais ▾';
      select.appendChild(placeholder);

      for (const modulo of administrativos) {
        const option = document.createElement('option');
        option.value = modulo.id;
        option.textContent = modulo.label;
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        if (select.value) {
          navegarPara(select.value);
        }
      });
      containerMenu.appendChild(select);
    }
  }

  function criarBotaoMenu(modulo) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.dataset.moduloId = modulo.id;
    botao.textContent = modulo.label;
    botao.addEventListener('click', () => {
      navegarPara(modulo.id);
    });
    return botao;
  }

  function destacarModuloAtivo(id) {
    if (!containerMenu?.querySelectorAll) {
      return;
    }

    const botoes = containerMenu.querySelectorAll('[data-modulo-id]');
    for (const botao of botoes) {
      botao.classList.toggle('ativo', botao.dataset.moduloId === id);
    }

    for (const filho of containerMenu.children || []) {
      if (filho.tagName !== 'SELECT' && filho.tagName !== 'select') {
        continue;
      }
      const opcoes = [...(filho.children || [])];
      const encontrado = opcoes.some((op) => op.value === id);
      filho.value = encontrado ? id : '';
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
