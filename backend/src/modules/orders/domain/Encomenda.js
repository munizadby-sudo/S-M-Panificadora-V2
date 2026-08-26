import { dinheiro } from '../../products/domain/Produto.js';
import {
  ClienteContatoObrigatorioError,
  EncomendaEntregueBloqueadaError,
  EncomendaNaoEstaProntaError,
  ItensObrigatoriosError,
  QuantidadeItemInvalidaError,
  SinalInvalidoError,
  StatusEncomendaInvalidoError,
  TransicaoStatusInvalidaError,
  UsuarioExecutorObrigatorioError,
} from './erros.js';

export const STATUS_ENCOMENDA = Object.freeze(['pendente', 'pronto', 'entregue']);

export function quantidadeEncomenda(valor) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export class EncomendaItem {
  constructor({ id = null, produtoId, quantidade, precoUnitario }) {
    this.id = id;
    this.produtoId = Number(produtoId);
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0) {
      throw new QuantidadeItemInvalidaError('Produto do item é obrigatório.');
    }
    this.quantidade = validarQuantidade(quantidade);
    this.precoUnitario = dinheiro(precoUnitario);
    this.subtotal = dinheiro(this.quantidade * this.precoUnitario);
  }

  static reconstituir({ id, produtoId, quantidade, precoUnitario, subtotal }) {
    const item = Object.create(EncomendaItem.prototype);
    item.id = id;
    item.produtoId = Number(produtoId);
    item.quantidade = quantidadeEncomenda(quantidade);
    item.precoUnitario = dinheiro(precoUnitario);
    item.subtotal = dinheiro(subtotal);
    return item;
  }
}

export class Encomenda {
  static reconstituir({
    id,
    numero,
    clienteId,
    clienteNome,
    clienteTelefone,
    dataEntrega,
    sinal,
    observacoes,
    itens,
    total,
    status,
    ativo = true,
    usuarioId,
    criadoEm = null,
  }) {
    const encomenda = Object.create(Encomenda.prototype);
    encomenda.id = id;
    encomenda.numero = Number(numero);
    encomenda.clienteId = clienteId == null ? null : Number(clienteId);
    encomenda.clienteNome = clienteNome;
    encomenda.clienteTelefone = clienteTelefone;
    encomenda.dataEntrega = String(dataEntrega).slice(0, 10);
    encomenda.sinal = dinheiro(sinal);
    encomenda.observacoes = observacoes ?? null;
    encomenda.itens = (itens || []).map((item) => EncomendaItem.reconstituir(item));
    encomenda.total = dinheiro(total);
    encomenda.status = status;
    encomenda.ativo = Boolean(Number(ativo));
    encomenda.usuarioId = Number(usuarioId);
    encomenda.criadoEm = criadoEm;
    return encomenda;
  }

  constructor({
    id = null,
    numero,
    clienteId = null,
    clienteNome,
    clienteTelefone,
    dataEntrega,
    sinal = 0,
    observacoes = null,
    itens,
    status = 'pendente',
    ativo = true,
    usuarioId,
    criadoEm = null,
    total: totalExterno,
  }) {
    if (totalExterno !== undefined) {
      throw new Error('total é sempre derivado dos itens, não pode ser informado externamente.');
    }

    this.id = id;
    this.numero = Number(numero);
    this.clienteId = clienteId == null || clienteId === '' ? null : Number(clienteId);
    this.clienteNome = validarContato(clienteNome, 'nome');
    this.clienteTelefone = validarContato(clienteTelefone, 'telefone');
    this.dataEntrega = String(dataEntrega ?? '').slice(0, 10);
    this.sinal = validarSinal(sinal);
    this.observacoes = observacoes ? String(observacoes).trim() : null;
    this.itens = montarItens(itens);
    this.total = calcularTotal(this.itens);
    this.status = validarStatus(status);
    this.ativo = Boolean(ativo);
    this.usuarioId = Number(usuarioId);
    if (!Number.isInteger(this.usuarioId) || this.usuarioId <= 0) {
      throw new UsuarioExecutorObrigatorioError();
    }
    this.criadoEm = criadoEm;
  }

  cancelar() {
    if (this.status === 'entregue') {
      throw new EncomendaEntregueBloqueadaError('Encomenda entregue não pode ser cancelada. Reabra pelo administrador se precisar corrigir.');
    }
    this.ativo = false;
    return this;
  }

  saldoAReceber() {
    if (this.status === 'entregue') {
      return 0;
    }
    const saldo = dinheiro(this.total - this.sinal);
    return saldo > 0 ? saldo : 0;
  }

  mudarStatus(status, { role } = {}) {
    const novo = validarStatus(status);
    if (novo === this.status) {
      return this;
    }
    if (this.status === 'entregue' && role !== 'admin') {
      throw new EncomendaEntregueBloqueadaError();
    }
    if (novo === 'entregue') {
      throw new TransicaoStatusInvalidaError(
        'Para marcar como entregue, finalize a encomenda recebendo o saldo.',
      );
    }
    const admin = role === 'admin';
    if (this.status === 'pendente' && novo === 'pronto') {
      this.status = novo;
      return this;
    }
    if (admin && this.status === 'pronto' && novo === 'pendente') {
      this.status = novo;
      return this;
    }
    if (admin && this.status === 'entregue' && novo === 'pronto') {
      this.status = novo;
      return this;
    }
    throw new TransicaoStatusInvalidaError();
  }

  finalizarEntrega() {
    if (this.status !== 'pronto') {
      throw new EncomendaNaoEstaProntaError();
    }
    this.status = 'entregue';
    return this;
  }

  garantirEditavel() {
    if (this.status === 'entregue') {
      throw new EncomendaEntregueBloqueadaError('Encomenda entregue não pode ser editada.');
    }
    return this;
  }

  paraPublico() {
    return {
      id: this.id,
      numero: this.numero,
      cliente_id: this.clienteId,
      cliente_nome: this.clienteNome,
      cliente_telefone: this.clienteTelefone,
      data_entrega: this.dataEntrega,
      sinal: this.sinal,
      observacoes: this.observacoes,
      total: this.total,
      status: this.status,
      saldo_a_receber: this.saldoAReceber(),
      itens: this.itens.map((item) => ({
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario: item.precoUnitario,
        subtotal: item.subtotal,
      })),
    };
  }

  paraListagem() {
    return {
      id: this.id,
      numero: this.numero,
      cliente: this.clienteNome,
      cliente_telefone: this.clienteTelefone,
      data_entrega: this.dataEntrega,
      sinal: this.sinal,
      total: this.total,
      status: this.status,
      saldo_a_receber: this.saldoAReceber(),
      ativo: this.ativo ? 1 : 0,
    };
  }
}

function montarItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new ItensObrigatoriosError();
  }
  return itens.map((item) => {
    if (item instanceof EncomendaItem) {
      return item;
    }
    return new EncomendaItem({
      produtoId: item.produtoId ?? item.produto_id,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario ?? item.preco_unitario,
    });
  });
}

function calcularTotal(itens) {
  return dinheiro(itens.reduce((acc, item) => acc + item.subtotal, 0));
}

function validarQuantidade(quantidade) {
  const valor = quantidadeEncomenda(quantidade);
  if (!(valor > 0)) {
    throw new QuantidadeItemInvalidaError();
  }
  return valor;
}

function validarStatus(status) {
  const valor = String(status ?? '').trim().toLowerCase();
  if (!STATUS_ENCOMENDA.includes(valor)) {
    throw new StatusEncomendaInvalidoError();
  }
  return valor;
}

function validarSinal(sinal) {
  const valor = dinheiro(sinal);
  if (valor < 0) {
    throw new SinalInvalidoError();
  }
  return valor;
}

function validarContato(valor, campo) {
  const texto = String(valor ?? '').trim();
  if (!texto) {
    throw new ClienteContatoObrigatorioError(
      `${campo === 'nome' ? 'Nome' : 'Telefone'} de contato é obrigatório.`,
    );
  }
  return texto;
}
