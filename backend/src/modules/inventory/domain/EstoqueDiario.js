import {
  DataEstoqueInvalidaError,
  EstoqueInsuficienteError,
  QuantidadeInvalidaError,
} from './erros.js';

export function quantidade(valor) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export function normalizarData(data) {
  const valor = String(data ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new DataEstoqueInvalidaError();
  }
  return valor;
}

export function dataHoje(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

export class EstoqueDiario {
  constructor({
    id = null,
    produtoId,
    data,
    inicial = 0,
    produzido = 0,
    vendido = 0,
    minimo = null,
    atualizadoEm = null,
  }) {
    this.id = id;
    this.produtoId = Number(produtoId);
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0) {
      throw new DataEstoqueInvalidaError('Produto é obrigatório.');
    }
    this.data = normalizarData(data);
    this.inicial = naoNegativo(inicial, 'inicial');
    this.produzido = naoNegativo(produzido, 'produzido');
    this.vendido = naoNegativo(vendido, 'vendido');
    this.minimo = minimo == null || minimo === '' ? null : naoNegativo(minimo, 'minimo');
    this.atualizadoEm = atualizadoEm;
    garantirDisponivel(this);
  }

  disponivel() {
    return quantidade(this.inicial + this.produzido - this.vendido);
  }

  abaixoDoMinimo() {
    return this.minimo != null && this.disponivel() < this.minimo;
  }

  ajustar({ inicial, produzido, minimo } = {}) {
    if (inicial !== undefined) {
      this.inicial = naoNegativo(inicial, 'inicial');
    }
    if (produzido !== undefined) {
      this.produzido = naoNegativo(produzido, 'produzido');
    }
    if (minimo !== undefined) {
      this.minimo = minimo == null || minimo === '' ? null : naoNegativo(minimo, 'minimo');
    }
    garantirDisponivel(this);
    return this;
  }

  debitar(valor) {
    const qtd = positivo(valor, 'quantidade');
    if (this.disponivel() < qtd) {
      throw new EstoqueInsuficienteError();
    }
    this.vendido = quantidade(this.vendido + qtd);
    return this;
  }

  reverterDebito(valor) {
    const qtd = positivo(valor, 'quantidade');
    if (this.vendido < qtd) {
      throw new EstoqueInsuficienteError('Não há débito suficiente para reverter.');
    }
    this.vendido = quantidade(this.vendido - qtd);
    return this;
  }

  paraPublico(nome = null) {
    return {
      produto_id: this.produtoId,
      nome,
      data: this.data,
      inicial: this.inicial,
      produzido: this.produzido,
      vendido: this.vendido,
      disponivel: this.disponivel(),
      minimo: this.minimo,
      abaixo_do_minimo: this.abaixoDoMinimo(),
    };
  }
}

function naoNegativo(valor, campo) {
  const qtd = quantidade(valor);
  if (qtd < 0) {
    throw new QuantidadeInvalidaError(campo);
  }
  return qtd;
}

function positivo(valor, campo) {
  const qtd = quantidade(valor);
  if (!(qtd > 0)) {
    throw new QuantidadeInvalidaError(campo, `${campo} deve ser maior que zero.`);
  }
  return qtd;
}

function garantirDisponivel(estoque) {
  if (estoque.disponivel() < 0) {
    throw new EstoqueInsuficienteError();
  }
}
