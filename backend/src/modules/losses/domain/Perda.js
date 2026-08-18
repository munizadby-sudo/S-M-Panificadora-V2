import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { dinheiro } from '../../products/domain/Produto.js';
import {
  CustoCalculadoExternoError,
  MotivoInvalidoError,
  QuantidadeInvalidaError,
} from './erros.js';

export const MOTIVOS_PERDA = Object.freeze(['queimado', 'vencido', 'danificado', 'sobra']);

export function quantidadePerda(valor) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export class Perda {
  static reconstituir({
    id,
    produtoId,
    data,
    quantidade,
    motivo,
    custoCalculado,
    usuarioId,
    ativo = true,
    criadoEm = null,
  }) {
    const perda = Object.create(Perda.prototype);
    perda.id = id;
    perda.produtoId = Number(produtoId);
    perda.data = String(data).slice(0, 10);
    perda.quantidade = quantidadePerda(quantidade);
    perda.motivo = motivo;
    perda.custoCalculado = dinheiro(custoCalculado);
    perda.usuarioId = Number(usuarioId);
    perda.ativo = Boolean(Number(ativo));
    perda.criadoEm = criadoEm;
    return perda;
  }

  constructor({
    id = null,
    produtoId,
    data,
    quantidade,
    motivo,
    produtoCusto,
    usuarioId,
    ativo = true,
    criadoEm = null,
    custoCalculado: _ignorado,
  }) {
    if (_ignorado !== undefined) {
      throw new CustoCalculadoExternoError();
    }

    this.id = id;
    this.produtoId = Number(produtoId);
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0) {
      throw new QuantidadeInvalidaError('Produto é obrigatório.');
    }
    this.data = normalizarData(data);
    this.quantidade = validarQuantidade(quantidade);
    this.motivo = validarMotivo(motivo);
    this.custoCalculado = calcularCusto(produtoCusto, this.quantidade);
    this.usuarioId = Number(usuarioId);
    if (!Number.isInteger(this.usuarioId) || this.usuarioId <= 0) {
      throw new QuantidadeInvalidaError('Usuário executor é obrigatório.');
    }
    this.ativo = Boolean(Number(ativo));
    this.criadoEm = criadoEm;
  }

  estornar() {
    this.ativo = false;
    return this;
  }

  paraPublico() {
    return {
      id: this.id,
      produto_id: this.produtoId,
      data: this.data,
      quantidade: this.quantidade,
      motivo: this.motivo,
      custo_calculado: this.custoCalculado,
    };
  }

  paraListagem({ produtoNome, usuarioNome }) {
    return {
      id: this.id,
      produto: produtoNome,
      data: this.data,
      quantidade: this.quantidade,
      motivo: this.motivo,
      custo_calculado: this.custoCalculado,
      usuario: usuarioNome,
      ativo: this.ativo ? 1 : 0,
    };
  }
}

function validarQuantidade(quantidade) {
  const valor = quantidadePerda(quantidade);
  if (!(valor > 0)) {
    throw new QuantidadeInvalidaError();
  }
  return valor;
}

function validarMotivo(motivo) {
  const valor = String(motivo ?? '').trim().toLowerCase();
  if (!MOTIVOS_PERDA.includes(valor)) {
    throw new MotivoInvalidoError();
  }
  return valor;
}

function calcularCusto(produtoCusto, quantidade) {
  return dinheiro(Number(produtoCusto) * quantidade);
}
