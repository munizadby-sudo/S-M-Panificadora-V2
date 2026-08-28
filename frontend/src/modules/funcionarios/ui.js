import { dataHoje, escapar, formatarMoeda } from './html.js';
import {
  MOTIVOS_NAO_CUMPRIMENTO,
  ROTULOS_TIPO_OCORRENCIA,
  textoDetalheOcorrencia,
} from './ocorrencias.js';
import {
  cargoSugereQuinzena,
  funcionarioEhQuinzenal,
  salarioQuinzena,
} from './quinzena.js';

function periodicidadeDoFormulario(formulario = {}) {
  if (formulario.periodicidade) return formulario.periodicidade;
  return cargoSugereQuinzena(formulario.cargo) ? 'quinzenal' : 'mensal';
}

function htmlCelulaSalario(item) {
  if (funcionarioEhQuinzenal(item)) {
    const quinzena = item.salario_periodo ?? salarioQuinzena(item.salario_base);
    return `${formatarMoeda(item.salario_base)}/mês
      <small class="funcionarios-dica">Quinzena ${formatarMoeda(quinzena)} · 1ª e 2ª quinzena (dias 5 e 20)</small>`;
  }
  return `${formatarMoeda(item.salario_base)}/mês`;
}

function htmlAtalhosPeriodoFolha(funcionarios, funcionarioId) {
  const escolhido = (funcionarios || []).find((f) => String(f.id) === String(funcionarioId));
  if (!escolhido) return '';
  if (funcionarioEhQuinzenal(escolhido)) {
    return `<div class="funcionarios-quinzena-acoes">
      <button type="button" data-quinzena="dia5">1ª quinzena (paga dia 5)</button>
      <button type="button" data-quinzena="dia20">2ª quinzena (paga dia 20)</button>
    </div>
    <p class="funcionarios-dica">Padeiro e ajudante: metade do salário mensal em cada quinzena.</p>`;
  }
  return `<div class="funcionarios-quinzena-acoes">
      <button type="button" data-mes-anterior>Mês anterior</button>
    </div>
    <p class="funcionarios-dica">Balconista e demais mensais: a folha é do mês anterior.</p>`;
}

export function valorOcorrenciaParaTipo(tipo, valorInformado) {
  if (tipo === 'atestado') return 0;
  const n = Number(valorInformado);
  return Number.isFinite(n) ? n : 0;
}

export function campoValorOcorrenciaDesabilitado(tipo) {
  return tipo === 'atestado';
}

export function htmlTabelaFuncionarios(funcionarios) {
  if (!Array.isArray(funcionarios) || funcionarios.length === 0) {
    return '<p class="estado-vazio">Nenhum funcionário cadastrado.<span class="estado-vazio-dica">Aqui aparece a equipe. Cadastre o primeiro funcionário pelo formulário.</span></p>';
  }
  const linhas = funcionarios
    .map((item) => {
      const inativo = Number(item.ativo) === 0;
      const acoes = inativo
        ? `<button type="button" data-reativar-funcionario="${escapar(item.id)}">Reativar</button>`
        : `<button type="button" data-editar-funcionario="${escapar(item.id)}">Editar</button>
           <button type="button" data-desativar-funcionario="${escapar(item.id)}">Desativar</button>`;
      return `<tr class="${inativo ? 'funcionarios-linha-inativa' : ''}">
        <td>${escapar(item.nome)}${inativo ? ' <span class="funcionarios-inativo">Inativo</span>' : ''}</td>
        <td>${escapar(item.cargo)}</td>
        <td>${htmlCelulaSalario(item)}</td>
        <td>${escapar(item.data_admissao)}</td>
        <td class="funcionarios-acoes">${acoes}</td>
      </tr>`;
    })
    .join('');
  return `<table class="funcionarios-tabela"><thead><tr>
    <th>Nome</th><th>Cargo</th><th>Salário</th><th>Admissão</th><th>Ações</th>
  </tr></thead><tbody>${linhas}</tbody></table>`;
}

export function htmlFormularioFuncionario(formulario = {}, erros = {}) {
  const titulo = formulario.id ? 'Editar funcionário' : 'Novo funcionário';
  return `<div class="funcionarios-modal" id="modal-form-funcionario" role="dialog" aria-modal="true" aria-labelledby="titulo-form-funcionario">
  <form id="form-funcionario" class="funcionarios-modal-caixa funcionarios-form">
    <header class="form-modal-cabecalho">
      <h2 id="titulo-form-funcionario">${titulo}</h2>
    </header>
    <div class="form-modal-corpo">
      <label>Nome <input id="func-nome" value="${escapar(formulario.nome || '')}" required></label>
      <p class="campo-erro">${escapar(erros.nome || '')}</p>
      <label>Cargo <input id="func-cargo" value="${escapar(formulario.cargo || '')}" required></label>
      <p class="campo-erro">${escapar(erros.cargo || '')}</p>
      <label>Salário base (mensal) <input id="func-salario" type="number" min="0.01" step="0.01" value="${escapar(formulario.salario_base ?? '')}" required></label>
      <p class="campo-erro">${escapar(erros.salario_base || '')}</p>
      <label>Pagamento
        <select id="func-periodicidade">
          <option value="mensal"${periodicidadeDoFormulario(formulario) === 'mensal' ? ' selected' : ''}>Mensal</option>
          <option value="quinzenal"${periodicidadeDoFormulario(formulario) === 'quinzenal' ? ' selected' : ''}>Quinzenal — 1ª e 2ª quinzena (dia 5 e dia 20)</option>
        </select>
      </label>
      <p class="funcionarios-dica">Padeiro e ajudante recebem a cada quinzena: 1ª no dia 5, 2ª no dia 20. A folha usa metade do salário mensal.</p>
      <label>Data de admissão <input id="func-admissao" type="date" value="${escapar(formulario.data_admissao || dataHoje())}" required></label>
    </div>
    <div class="funcionarios-form-acoes">
      <button type="button" id="btn-cancelar-funcionario">Cancelar</button>
      <button type="submit">${formulario.id ? 'Salvar' : 'Cadastrar'}</button>
    </div>
  </form>
</div>`;
}

function opcoesFuncionarios(funcionarios, selecionado = '') {
  return `<option value="">Selecione</option>${(funcionarios || [])
    .filter((f) => Number(f.ativo) !== 0)
    .map(
      (f) =>
        `<option value="${escapar(f.id)}"${String(f.id) === String(selecionado) ? ' selected' : ''}>${escapar(f.nome)}</option>`,
    )
    .join('')}`;
}

function htmlModalFuncionarios({ modalId, formId, tituloId, titulo, corpo, erro = '', cancelarId, submit }) {
  return `<div class="funcionarios-modal" id="${modalId}" role="dialog" aria-modal="true" aria-labelledby="${tituloId}">
  <form id="${formId}" class="funcionarios-modal-caixa funcionarios-form">
    <header class="form-modal-cabecalho">
      <h2 id="${tituloId}">${escapar(titulo)}</h2>
    </header>
    <div class="form-modal-corpo">
      ${corpo}
      <p class="funcionarios-erro" role="alert">${escapar(erro)}</p>
    </div>
    <div class="funcionarios-form-acoes">
      <button type="button" id="${cancelarId}">Cancelar</button>
      <button type="submit">${escapar(submit)}</button>
    </div>
  </form>
</div>`;
}

export function htmlFormularioAdiantamento({ funcionarios, formulario = {}, erro = '' }) {
  return htmlModalFuncionarios({
    modalId: 'modal-form-adiantamento',
    formId: 'form-adiantamento',
    tituloId: 'titulo-form-adiantamento',
    titulo: 'Lançar adiantamento',
    cancelarId: 'btn-cancelar-adiantamento',
    submit: 'Lançar adiantamento',
    erro,
    corpo: `<label>Funcionário <select id="adiant-funcionario" required>${opcoesFuncionarios(funcionarios, formulario.funcionario_id)}</select></label>
      <label>Valor <input id="adiant-valor" type="number" min="0.01" step="0.01" value="${escapar(formulario.valor ?? '')}" required></label>
      <label>Data <input id="adiant-data" type="date" value="${escapar(formulario.data || dataHoje())}" required></label>
      <label>Observação <input id="adiant-obs" value="${escapar(formulario.observacao || '')}"></label>`,
  });
}

export function htmlTabelaAdiantamentos(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhum adiantamento.<span class="estado-vazio-dica">Aqui aparecem os adiantamentos do período selecionado.</span></p>';
  }
  const linhas = itens
    .map(
      (item) => `<tr>
      <td>${escapar(item.funcionario_nome || item.funcionario_id)}</td>
      <td>${formatarMoeda(item.valor)}</td>
      <td>${escapar(item.data)}</td>
      <td>${escapar(item.observacao || '')}</td>
    </tr>`,
    )
    .join('');
  return `<table class="funcionarios-tabela"><thead><tr><th>Funcionário</th><th>Valor</th><th>Data</th><th>Obs.</th></tr></thead><tbody>${linhas}</tbody></table>`;
}

export function htmlTabelaOcorrencias(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhuma ocorrência.<span class="estado-vazio-dica">Aqui aparecem faltas, atestados, horas extras e não cumprimento do trabalho. Lance a primeira pela ação Nova ocorrência.</span></p>';
  }
  const linhas = itens
    .map(
      (item) => `<tr>
      <td>${escapar(item.funcionario_nome || item.funcionario_id)}</td>
      <td>${escapar(ROTULOS_TIPO_OCORRENCIA[item.tipo] || item.tipo)}</td>
      <td>${escapar(item.data)}</td>
      <td>${formatarMoeda(item.valor)}</td>
      <td>${escapar(textoDetalheOcorrencia(item) || '')}</td>
    </tr>`,
    )
    .join('');
  return `<table class="funcionarios-tabela"><thead><tr>
    <th>Funcionário</th><th>Tipo</th><th>Data</th><th>Valor</th><th>Obs.</th>
  </tr></thead><tbody>${linhas}</tbody></table>`;
}

export function htmlFormularioOcorrencia({ funcionarios, formulario = {}, erro = '' }) {
  const tipo = formulario.tipo || 'falta';
  const atestado = campoValorOcorrenciaDesabilitado(tipo);
  const naoCumprimento = tipo === 'nao_cumprimento';
  const rotuloValor = naoCumprimento ? 'Desconto (R$)' : 'Valor';
  const motivoHtml = naoCumprimento
    ? `<label>Motivo
        <select id="ocor-motivo" required>
          <option value="">Selecione</option>
          ${MOTIVOS_NAO_CUMPRIMENTO.map(
            (item) =>
              `<option value="${escapar(item.id)}"${formulario.motivo === item.id ? ' selected' : ''}>${escapar(item.rotulo)}</option>`,
          ).join('')}
        </select>
      </label>
      <p class="funcionarios-dica">Desconto por não cumprimento do exercício de trabalho. Entra na folha separado das faltas.</p>`
    : '';
  return htmlModalFuncionarios({
    modalId: 'modal-form-ocorrencia',
    formId: 'form-ocorrencia',
    tituloId: 'titulo-form-ocorrencia',
    titulo: 'Nova ocorrência',
    cancelarId: 'btn-cancelar-ocorrencia',
    submit: 'Lançar ocorrência',
    erro,
    corpo: `<label>Funcionário <select id="ocor-funcionario" required>${opcoesFuncionarios(funcionarios, formulario.funcionario_id)}</select></label>
      <label>Tipo
        <select id="ocor-tipo" required>
          <option value="falta"${tipo === 'falta' ? ' selected' : ''}>Falta</option>
          <option value="atestado"${tipo === 'atestado' ? ' selected' : ''}>Atestado</option>
          <option value="hora_extra"${tipo === 'hora_extra' ? ' selected' : ''}>Hora extra</option>
          <option value="nao_cumprimento"${tipo === 'nao_cumprimento' ? ' selected' : ''}>Não cumprimento do trabalho</option>
        </select>
      </label>
      ${motivoHtml}
      <label>Data <input id="ocor-data" type="date" value="${escapar(formulario.data || dataHoje())}" required></label>
      <label>${rotuloValor}
        <input id="ocor-valor" type="number" min="0" step="0.01"
          value="${escapar(atestado ? '0' : formulario.valor ?? '')}"
          ${atestado ? 'disabled' : ''}>
      </label>
      <label>Observação <input id="ocor-obs" value="${escapar(formulario.observacao || '')}"></label>`,
  });
}

export function htmlFormularioFechamento({ funcionarios, formulario = {}, resultado = null, erro = '' }) {
  const resumo = resultado
    ? `<aside class="funcionarios-resumo-folha" data-folha-resultado>
        <p>Salário base: <strong>${formatarMoeda(resultado.salario_base)}</strong></p>
        <p>Adiantamentos: <strong>${formatarMoeda(resultado.total_adiantamentos)}</strong></p>
        <p>Faltas: <strong>${formatarMoeda(resultado.total_faltas)}</strong></p>
        <p>Não cumprimento: <strong>${formatarMoeda(resultado.total_nao_cumprimento)}</strong></p>
        <p>Horas extras: <strong>${formatarMoeda(resultado.total_horas_extras)}</strong></p>
        <p>Líquido: <strong data-valor-liquido="${escapar(resultado.valor_liquido)}">${formatarMoeda(resultado.valor_liquido)}</strong></p>
      </aside>`
    : '';
  return htmlModalFuncionarios({
    modalId: 'modal-form-folha',
    formId: 'form-fechar-folha',
    tituloId: 'titulo-form-folha',
    titulo: 'Fechar folha',
    cancelarId: 'btn-cancelar-folha',
    submit: resultado ? 'Fechar outra folha' : 'Fechar folha',
    erro,
    corpo: `<label>Funcionário <select id="folha-funcionario" required>${opcoesFuncionarios(funcionarios, formulario.funcionario_id)}</select></label>
      <label>Início <input id="folha-inicio" type="date" value="${escapar(formulario.periodo_inicio || '')}" required></label>
      <label>Fim <input id="folha-fim" type="date" value="${escapar(formulario.periodo_fim || '')}" required></label>
      ${htmlAtalhosPeriodoFolha(funcionarios, formulario.funcionario_id)}
      ${resumo}`,
  });
}

export function htmlTabelaFolhas(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhuma folha.<span class="estado-vazio-dica">Aqui aparecem as folhas fechadas. Use Fechar folha para gerar a primeira.</span></p>';
  }
  const linhas = itens
    .map((item) => {
      const acao =
        item.status === 'pendente'
          ? `<button type="button" data-pagar-folha="${escapar(item.id)}">Marcar como paga</button>`
          : '<span class="funcionarios-status-paga">Paga</span>';
      return `<tr>
        <td>${escapar(item.funcionario_nome || item.funcionario_id)}</td>
        <td>${escapar(item.periodo_inicio)} — ${escapar(item.periodo_fim)}</td>
        <td>${formatarMoeda(item.salario_base)}</td>
        <td data-liquido-folha="${escapar(item.id)}">${formatarMoeda(item.valor_liquido)}</td>
        <td>${escapar(item.status)}</td>
        <td>
          <button type="button" data-imprimir-folha="${escapar(item.id)}">Imprimir (2 vias)</button>
          ${acao}
        </td>
      </tr>`;
    })
    .join('');
  return `<table class="funcionarios-tabela"><thead><tr>
    <th>Funcionário</th><th>Período</th><th>Salário</th><th>Líquido</th><th>Status</th><th></th>
  </tr></thead><tbody>${linhas}</tbody></table>`;
}
