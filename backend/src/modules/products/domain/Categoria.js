import { NomeInvalidoError } from './erros.js';

export class Categoria {
  constructor({ id = null, nome, ativo = true, criadoEm = null }) {
    this.id = id;
    this.nome = normalizarNome(nome);
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
      ativo: this.ativo ? 1 : 0,
      criado_em: this.criadoEm,
    };
  }
}

export function normalizarNome(nome) {
  const valor = String(nome ?? '').trim();
  if (!valor) {
    throw new NomeInvalidoError();
  }
  return valor;
}
