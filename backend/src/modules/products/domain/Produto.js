import { CustoInvalidoError, NomeInvalidoError, PrecoInvalidoError } from './erros.js';
import { normalizarNome } from './Categoria.js';

export function dinheiro(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export class Produto {
  constructor({
    id = null,
    nome,
    categoriaId,
    icone = null,
    preco,
    custo,
    ativo = true,
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
