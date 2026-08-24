import {
  atualizarFuncionario,
  criarAdiantamento,
  criarFuncionario,
  criarOcorrencia,
  desativarFuncionario,
  fecharFolha,
  listarAdiantamentos,
  listarFolhas,
  listarFuncionarios,
  marcarFolhaPaga,
  mensagemErroFuncionarios,
  reativarFuncionario,
} from './api.js';
import { dataHoje, escapar } from './html.js';
import {
  campoValorOcorrenciaDesabilitado,
  htmlFormularioAdiantamento,
  htmlFormularioFechamento,
  htmlFormularioFuncionario,
  htmlFormularioOcorrencia,
  htmlTabelaAdiantamentos,
  htmlTabelaFolhas,
  htmlTabelaFuncionarios,
  valorOcorrenciaParaTipo,
} from './ui.js';

export {
  htmlTabelaFuncionarios,
  htmlFormularioOcorrencia,
  htmlFormularioFechamento,
  htmlTabelaFolhas,
  valorOcorrenciaParaTipo,
  campoValorOcorrenciaDesabilitado,
} from './ui.js';
export { mensagemErroFuncionarios } from './api.js';

let containerAtual;
let estado;

export default {
  id: 'funcionarios',
  label: 'Funcionários',
  icone: 'ti-users',
  permissao: 'admin',
  async montar(container) {
    if (!container) return;
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
    aba: 'cadastro',
    funcionarios: [],
    adiantamentos: [],
    folhas: [],
    erro: '',
    mostrarFormFuncionario: false,
    formularioFuncionario: {},
    formularioAdiantamento: { data: dataHoje() },
    erroAdiantamento: '',
    formularioOcorrencia: { tipo: 'falta', data: dataHoje(), valor: '' },
    erroOcorrencia: '',
    formularioFolha: {},
    resultadoFolha: null,
    erroFolha: '',
    mostrarInativos: false,
  };
}

async function recarregar() {
  try {
    estado.erro = '';
    const ativo = estado.mostrarInativos ? undefined : 1;
    const [funcs, adiant, folhas] = await Promise.all([
      listarFuncionarios({ ativo, limit: 100 }),
      listarAdiantamentos({ limit: 50 }),
      listarFolhas({ limit: 50 }),
    ]);
    estado.funcionarios = funcs.data || [];
    estado.adiantamentos = adiant.data || [];
    estado.folhas = folhas.data || [];
  } catch (erro) {
    estado.erro = mensagemErroFuncionarios(erro);
  }
  renderizar();
}

function renderizar() {
  if (!containerAtual || !estado) return;
  const ativos = estado.funcionarios.filter((f) => Number(f.ativo) !== 0);
  let painel = '';
  if (estado.aba === 'cadastro') {
    painel = `
      <div class="funcionarios-acoes-topo">
        <button type="button" id="btn-novo-funcionario">Novo funcionário</button>
        <label class="funcionarios-toggle"><input type="checkbox" id="mostrar-inativos-func"${estado.mostrarInativos ? ' checked' : ''}> Mostrar inativos</label>
      </div>
      ${estado.mostrarFormFuncionario ? htmlFormularioFuncionario(estado.formularioFuncionario) : ''}
      <div id="lista-funcionarios">${htmlTabelaFuncionarios(estado.funcionarios)}</div>`;
  } else if (estado.aba === 'adiantamentos') {
    painel = `<h2>Adiantamentos</h2>
      ${htmlFormularioAdiantamento({ funcionarios: ativos, formulario: estado.formularioAdiantamento, erro: estado.erroAdiantamento })}
      <div id="lista-adiantamentos">${htmlTabelaAdiantamentos(estado.adiantamentos)}</div>`;
  } else if (estado.aba === 'ocorrencias') {
    painel = `<h2>Ocorrências</h2>
      ${htmlFormularioOcorrencia({ funcionarios: ativos, formulario: estado.formularioOcorrencia, erro: estado.erroOcorrencia })}`;
  } else {
    painel = `<h2>Fechamento de folha</h2>
      ${htmlFormularioFechamento({ funcionarios: ativos, formulario: estado.formularioFolha, resultado: estado.resultadoFolha, erro: estado.erroFolha })}
      <h2>Folhas</h2>
      <div id="lista-folhas">${htmlTabelaFolhas(estado.folhas)}</div>`;
  }

  containerAtual.innerHTML = `
    <section class="funcionarios">
      <h1>Funcionários e Folha</h1>
      <nav class="funcionarios-abas">
        <button type="button" data-aba="cadastro"${estado.aba === 'cadastro' ? ' class="ativa"' : ''}>Cadastro</button>
        <button type="button" data-aba="adiantamentos"${estado.aba === 'adiantamentos' ? ' class="ativa"' : ''}>Adiantamentos</button>
        <button type="button" data-aba="ocorrencias"${estado.aba === 'ocorrencias' ? ' class="ativa"' : ''}>Ocorrências</button>
        <button type="button" data-aba="folha"${estado.aba === 'folha' ? ' class="ativa"' : ''}>Folha</button>
      </nav>
      <p class="funcionarios-erro" role="alert">${escapar(estado.erro)}</p>
      ${painel}
    </section>`;
  ligarEventos();
}

function ligarEventos() {
  const c = containerAtual;

  for (const botao of c.querySelectorAll('[data-aba]')) {
    botao.addEventListener('click', () => {
      estado.aba = botao.getAttribute('data-aba');
      renderizar();
    });
  }

  c.querySelector('#btn-novo-funcionario')?.addEventListener('click', () => {
    estado.mostrarFormFuncionario = true;
    estado.formularioFuncionario = { data_admissao: dataHoje() };
    renderizar();
  });

  c.querySelector('#btn-cancelar-funcionario')?.addEventListener('click', () => {
    estado.mostrarFormFuncionario = false;
    renderizar();
  });

  c.querySelector('#mostrar-inativos-func')?.addEventListener('change', async (ev) => {
    estado.mostrarInativos = Boolean(ev.target.checked);
    await recarregar();
  });

  c.querySelector('#form-funcionario')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const payload = {
      nome: c.querySelector('#func-nome')?.value,
      cargo: c.querySelector('#func-cargo')?.value,
      salario_base: Number(c.querySelector('#func-salario')?.value),
      data_admissao: c.querySelector('#func-admissao')?.value,
    };
    try {
      const id = estado.formularioFuncionario?.id;
      if (id) await atualizarFuncionario(id, payload);
      else await criarFuncionario(payload);
      estado.mostrarFormFuncionario = false;
      await recarregar();
    } catch (erro) {
      estado.erro = mensagemErroFuncionarios(erro);
      renderizar();
    }
  });

  for (const botao of c.querySelectorAll('[data-editar-funcionario]')) {
    botao.addEventListener('click', () => {
      const id = botao.getAttribute('data-editar-funcionario');
      estado.formularioFuncionario = {
        ...estado.funcionarios.find((f) => String(f.id) === String(id)),
      };
      estado.mostrarFormFuncionario = true;
      renderizar();
    });
  }

  for (const botao of c.querySelectorAll('[data-desativar-funcionario]')) {
    botao.addEventListener('click', async () => {
      if (globalThis.confirm && !globalThis.confirm('Desativar este funcionário?')) return;
      try {
        await desativarFuncionario(botao.getAttribute('data-desativar-funcionario'));
        await recarregar();
      } catch (erro) {
        estado.erro = mensagemErroFuncionarios(erro);
        renderizar();
      }
    });
  }

  for (const botao of c.querySelectorAll('[data-reativar-funcionario]')) {
    botao.addEventListener('click', async () => {
      try {
        await reativarFuncionario(botao.getAttribute('data-reativar-funcionario'));
        await recarregar();
      } catch (erro) {
        estado.erro = mensagemErroFuncionarios(erro);
        renderizar();
      }
    });
  }

  c.querySelector('#form-adiantamento')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      await criarAdiantamento({
        funcionario_id: Number(c.querySelector('#adiant-funcionario')?.value),
        valor: Number(c.querySelector('#adiant-valor')?.value),
        data: c.querySelector('#adiant-data')?.value,
        observacao: c.querySelector('#adiant-obs')?.value || undefined,
      });
      estado.formularioAdiantamento = { data: dataHoje() };
      estado.erroAdiantamento = '';
      await recarregar();
    } catch (erro) {
      estado.erroAdiantamento = mensagemErroFuncionarios(erro);
      renderizar();
    }
  });

  c.querySelector('#ocor-tipo')?.addEventListener('change', (ev) => {
    const tipo = ev.target.value;
    estado.formularioOcorrencia = {
      tipo,
      funcionario_id: c.querySelector('#ocor-funcionario')?.value,
      data: c.querySelector('#ocor-data')?.value,
      observacao: c.querySelector('#ocor-obs')?.value,
      valor: valorOcorrenciaParaTipo(tipo, c.querySelector('#ocor-valor')?.value),
    };
    renderizar();
  });

  c.querySelector('#form-ocorrencia')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const tipo = c.querySelector('#ocor-tipo')?.value;
    try {
      await criarOcorrencia({
        funcionario_id: Number(c.querySelector('#ocor-funcionario')?.value),
        tipo,
        data: c.querySelector('#ocor-data')?.value,
        valor: valorOcorrenciaParaTipo(tipo, c.querySelector('#ocor-valor')?.value),
        observacao: c.querySelector('#ocor-obs')?.value || undefined,
      });
      estado.formularioOcorrencia = { tipo: 'falta', data: dataHoje(), valor: '' };
      estado.erroOcorrencia = '';
      await recarregar();
    } catch (erro) {
      estado.erroOcorrencia = mensagemErroFuncionarios(erro);
      renderizar();
    }
  });

  c.querySelector('#form-fechar-folha')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const payload = {
      funcionario_id: Number(c.querySelector('#folha-funcionario')?.value),
      periodo_inicio: c.querySelector('#folha-inicio')?.value,
      periodo_fim: c.querySelector('#folha-fim')?.value,
    };
    try {
      estado.resultadoFolha = await fecharFolha(payload);
      estado.formularioFolha = payload;
      estado.erroFolha = '';
      await recarregar();
    } catch (erro) {
      estado.erroFolha = mensagemErroFuncionarios(erro);
      estado.resultadoFolha = null;
      renderizar();
    }
  });

  for (const botao of c.querySelectorAll('[data-pagar-folha]')) {
    botao.addEventListener('click', async () => {
      if (globalThis.confirm && !globalThis.confirm('Marcar esta folha como paga?')) return;
      try {
        await marcarFolhaPaga(botao.getAttribute('data-pagar-folha'));
        await recarregar();
      } catch (erro) {
        estado.erro = mensagemErroFuncionarios(erro);
        renderizar();
      }
    });
  }
}
