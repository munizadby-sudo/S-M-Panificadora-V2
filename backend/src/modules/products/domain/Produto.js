import {
  CodigoBalancaInvalidoError,
  CustoInvalidoError,
  NomeInvalidoError,
  PrecoInvalidoError,
  TipoEstoqueInvalidoError,
} from './erros.js';
import { normalizarNome } from './Categoria.js';

export function dinheiro(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export const TIPOS_ESTOQUE = Object.freeze(['unidade', 'peso']);

export class Produto {
  constructor({
    id = null,
    nome,
    categoriaId,
    icone = null,
    preco,
    custo,
    ativo = true,
    tipoEstoque = 'unidade',
    codigoBalanca = null,
    criadoEm = null,
  }) {
    this.id = id;
    this.nome = normalizarNome(nome);
    this.categoriaId = Number(categoriaId);
    if (!Number.isInteger(this.categoriaId) || this.categoriaId <= 0) {
      throw new NomeInvalidoError('Categoria é obrigatória.');
    }
    this.icone = icone == null || String(icone).trim() === '' ? null : String(icone).trim().slice(0, 10);
    this.preco = validarPreco(preco);
    this.custo = validarCusto(custo);
    this.ativo = Boolean(Number(ativo));
    this.tipoEstoque = validarTipoEstoque(tipoEstoque);
    this.codigoBalanca = validarCodigoBalanca(codigoBalanca, this.tipoEstoque);
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
      categoria_id: this.categoriaId,
      icone: this.icone,
      preco: this.preco,
      custo: this.custo,
      ativo: this.ativo ? 1 : 0,
      tipo_estoque: this.tipoEstoque,
      codigo_balanca: this.codigoBalanca,
    };
  }
}

function validarPreco(preco) {
  const valor = dinheiro(preco);
  if (!(valor > 0)) {
    throw new PrecoInvalidoError();
  }
  return valor;
}

function validarCusto(custo) {
  const valor = dinheiro(custo);
  if (valor < 0) {
    throw new CustoInvalidoError();
  }
  return valor;
}

function validarTipoEstoque(tipo) {
  const valor = String(tipo ?? '').trim().toLowerCase();
  if (!TIPOS_ESTOQUE.includes(valor)) {
    throw new TipoEstoqueInvalidoError();
  }
  return valor;
}

/** Código da balança (PLU, item 6 de docs/depois-do-teste.md): 5 dígitos, só em produtos por peso. */
function validarCodigoBalanca(codigo, tipoEstoque) {
  const valor = codigo == null || String(codigo).trim() === '' ? null : String(codigo).trim();
  if (tipoEstoque === 'peso') {
    if (!valor || !/^\d{5}$/.test(valor)) {
      throw new CodigoBalancaInvalidoError();
    }
    return valor;
  }
  if (valor !== null) {
    throw new CodigoBalancaInvalidoError('Código da balança só se aplica a produtos por peso.');
  }
  return null;
}
