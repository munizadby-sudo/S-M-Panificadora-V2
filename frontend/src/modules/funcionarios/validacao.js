export function validarFuncionario({ nome, cargo, salario_base, data_admissao } = {}) {
  const erros = {};
  const valores = {
    nome: String(nome ?? '').trim(),
    cargo: String(cargo ?? '').trim(),
    salario_base: Number(salario_base),
    data_admissao: String(data_admissao ?? '').trim(),
  };
  if (!valores.nome) erros.nome = 'Nome é obrigatório.';
  if (!valores.cargo) erros.cargo = 'Cargo é obrigatório.';
  if (!(valores.salario_base > 0)) erros.salario_base = 'Salário deve ser maior que zero.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.data_admissao)) {
    erros.data_admissao = 'Data de admissão inválida.';
  }
  return { ok: Object.keys(erros).length === 0, erros, valores };
}

export function validarAdiantamento({ funcionario_id, valor, data } = {}) {
  const erros = {};
  const valores = {
    funcionario_id: Number(funcionario_id),
    valor: Number(valor),
    data: String(data ?? '').trim(),
    observacao: undefined,
  };
  if (!valores.funcionario_id) erros.funcionario_id = 'Selecione o funcionário.';
  if (!(valores.valor > 0)) erros.valor = 'Valor deve ser maior que zero.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.data)) erros.data = 'Data inválida.';
  return { ok: Object.keys(erros).length === 0, erros, valores };
}

export function validarOcorrencia({ funcionario_id, tipo, valor, data, motivo } = {}) {
  const erros = {};
  const tipoNormalizado = String(tipo ?? '').trim().toLowerCase();
  const valores = {
    funcionario_id: Number(funcionario_id),
    tipo: tipoNormalizado,
    valor: tipoNormalizado === 'atestado' ? 0 : Number(valor),
    data: String(data ?? '').trim(),
    motivo: tipoNormalizado === 'nao_cumprimento' ? String(motivo ?? '').trim() : undefined,
  };
  if (!valores.funcionario_id) erros.funcionario_id = 'Selecione o funcionário.';
  if (!['falta', 'atestado', 'hora_extra', 'nao_cumprimento'].includes(valores.tipo)) {
    erros.tipo = 'Tipo inválido.';
  }
  if (valores.tipo === 'nao_cumprimento' && !valores.motivo) {
    erros.motivo = 'Selecione o motivo do não cumprimento.';
  }
  if (valores.tipo !== 'atestado' && (!(valores.valor >= 0) || Number.isNaN(valores.valor))) {
    erros.valor = 'Valor inválido.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.data)) erros.data = 'Data inválida.';
  return { ok: Object.keys(erros).length === 0, erros, valores };
}

export function validarFechamento({ funcionario_id, periodo_inicio, periodo_fim } = {}) {
  const erros = {};
  const valores = {
    funcionario_id: Number(funcionario_id),
    periodo_inicio: String(periodo_inicio ?? '').trim(),
    periodo_fim: String(periodo_fim ?? '').trim(),
  };
  if (!valores.funcionario_id) erros.funcionario_id = 'Selecione o funcionário.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.periodo_inicio)) {
    erros.periodo_inicio = 'Início inválido.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.periodo_fim)) {
    erros.periodo_fim = 'Fim inválido.';
  }
  if (
    valores.periodo_inicio &&
    valores.periodo_fim &&
    valores.periodo_inicio > valores.periodo_fim
  ) {
    erros.periodo_fim = 'Fim deve ser posterior ou igual ao início.';
  }
  return { ok: Object.keys(erros).length === 0, erros, valores };
}
