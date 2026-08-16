import {
  AutoDesativacaoNaoPermitidaError,
  PermissaoInvalidaError,
  RoleInvalidaError,
} from './erros.js';
import { PERMISSOES_VALIDAS, ROLES_VALIDOS } from './permissoes.js';

export class Usuario {
  constructor({
    id = null,
    nome,
    username,
    senhaHash,
    role = 'operador',
    permissoes,
    ativo = true,
    criadoEm = null,
  }) {
    this.id = id;
    this.nome = nome;
    this.username = normalizarUsername(username);
    this.senhaHash = senhaHash;
    this.role = validarRole(role);
    this.ativo = Boolean(Number(ativo));
    this.permissoes = normalizarPermissoes(this.role, permissoes);
    this.criadoEm = criadoEm;
  }

  possuiPermissao(modulo) {
    if (this.role === 'admin') {
      return true;
    }
    return this.permissoes.includes(modulo);
  }

  podeSerDesativadoPor(usuarioSolicitanteId) {
    return Number(usuarioSolicitanteId) !== Number(this.id);
  }

  desativarPor(usuarioSolicitanteId) {
    if (!this.podeSerDesativadoPor(usuarioSolicitanteId)) {
      throw new AutoDesativacaoNaoPermitidaError();
    }
    this.ativo = false;
    return this;
  }

  paraPublico() {
    return {
      id: this.id,
      nome: this.nome,
      username: this.username,
      role: this.role,
      permissoes: [...this.permissoes],
      ativo: this.ativo ? 1 : 0,
      criado_em: this.criadoEm,
    };
  }
}

export function normalizarUsername(username) {
  return String(username ?? '').trim().toLowerCase();
}

function validarRole(role) {
  if (!ROLES_VALIDOS.includes(role)) {
    throw new RoleInvalidaError(role);
  }
  return role;
}

function normalizarPermissoes(role, permissoes) {
  if (role === 'admin') {
    return [...PERMISSOES_VALIDAS];
  }

  const lista = Array.isArray(permissoes) ? permissoes : [];
  for (const item of lista) {
    if (!PERMISSOES_VALIDAS.includes(item)) {
      throw new PermissaoInvalidaError(item);
    }
  }
  return [...lista];
}
