import { dinheiro } from '../../products/domain/Produto.js';
import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import {
  CargoInvalidoError,
  DataAdmissaoInvalidaError,
  NomeInvalidoError,
  SalarioInvalidoError,
} from './erros.js';
import {
  PERIODICIDADE_QUINZENAL,
  normalizarPeriodicidade,
  salarioDoPeriodo,
} from './periodicidade.js';

export class Funcionario {
  constructor({
    id = null,
    nome,
    cargo,
    salarioBase,
    dataAdmissao,
    periodicidade,
    ativo = true,
    criadoEm = null,
  }) {
    this.id = id;
    this.nome = normalizarNome(nome);
    this.cargo = normalizarCargo(cargo);
    this.salarioBase = validarSalario(salarioBase);
    this.periodicidade = normalizarPeriodicidade(periodicidade, { cargo: this.cargo });
    this.dataAdmissao = validarDataAdmissao(dataAdmissao);
    this.ativo = Boolean(Number(ativo));
    this.criadoEm = criadoEm;
  }

  desativar() {
    this.ativo = false;
    return this;
  }

  reativar() {
    this.ativo = true;
    return this;
  }

  paraPublico() {
    return {
      id: this.id,
      nome: this.nome,
      cargo: this.cargo,
      salario_base: this.salarioBase,
      periodicidade: this.periodicidade,
      salario_periodo: salarioDoPeriodo(this.salarioBase, this.periodicidade),
      dias_pagamento: this.periodicidade === PERIODICIDADE_QUINZENAL ? [5, 20] : null,
      data_admissao: this.dataAdmissao,
      ativo: this.ativo ? 1 : 0,
      criado_em: this.criadoEm,
    };
  }
}

function normalizarNome(nome) {
  const valor = String(nome ?? '').trim();
  if (!valor) {
    throw new NomeInvalidoError();
  }
  return valor.slice(0, 100);
}

function normalizarCargo(cargo) {
  const valor = String(cargo ?? '').trim();
  if (!valor) {
    throw new CargoInvalidoError();
  }
  return valor.slice(0, 60);
}

function validarSalario(salarioBase) {
  const valor = dinheiro(salarioBase);
  if (!(valor > 0)) {
    throw new SalarioInvalidoError();
  }
  return valor;
}

function validarDataAdmissao(dataAdmissao) {
  try {
    return normalizarData(dataAdmissao);
  } catch {
    throw new DataAdmissaoInvalidaError();
  }
}
