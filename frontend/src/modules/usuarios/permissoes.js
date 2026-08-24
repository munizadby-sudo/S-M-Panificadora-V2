/**
 * Espelha backend/src/modules/users/domain/permissoes.js — manter sincronizado.
 */
export const PERMISSOES_VALIDAS = Object.freeze([
  'caixa',
  'encomendas',
  'estoque',
  'fluxo',
  'rel',
  'produtos',
  'producao',
  'perdas',
  'clientes',
]);

export const ROTULOS_PERMISSAO = Object.freeze({
  caixa: 'Caixa',
  encomendas: 'Encomendas',
  estoque: 'Estoque',
  fluxo: 'Fluxo de Caixa',
  rel: 'Relatórios',
  produtos: 'Produtos',
  producao: 'Produção',
  perdas: 'Perdas',
  clientes: 'Clientes',
});

export const ROLES = Object.freeze([
  { id: 'admin', label: 'Administrador' },
  { id: 'operador', label: 'Operador' },
]);
