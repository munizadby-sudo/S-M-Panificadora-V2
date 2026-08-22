import { NomeInvalidoError, TelefoneInvalidoError } from './erros.js';

const TELEFONE_MAX = 20;
const DIGITOS_MIN = 8;

export class Cliente {
  constructor({ id = null, nome, telefone, ativo = true, criadoEm = null }) {
    this.id = id;
    this.nome = normalizarNome(nome);
    this.telefone = normalizarTelefone(telefone);
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
      telefone: this.telefone,
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
  return valor.slice(0, 100);
}

export function normalizarTelefone(telefone) {
  const valor = String(telefone ?? '').trim();
  if (!valor) {
    throw new TelefoneInvalidoError();
  }
  if (valor.length > TELEFONE_MAX) {
    throw new TelefoneInvalidoError('Telefone deve ter no máximo 20 caracteres.');
  }
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length < DIGITOS_MIN) {
    throw new TelefoneInvalidoError('Telefone deve ter pelo menos 8 dígitos.');
  }
  return valor;
}
