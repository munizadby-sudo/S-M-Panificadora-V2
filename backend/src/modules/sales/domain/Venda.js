import { dataHoje } from '../../inventory/domain/EstoqueDiario.js';
import { dinheiro } from '../../products/domain/Produto.js';
import {
  CarrinhoVazioError,
  FormaPagamentoInvalidaError,
  PagamentosInvalidosError,
  QuantidadeItemInvalidaError,
  TotalExternoError,
  TurnoObrigatorioError,
} from './erros.js';

export const FORMAS_PAGAMENTO = Object.freeze(['dinheiro', 'pix', 'cartao', 'credito']);
/** Valor calculado de `formaPagamento` quando a venda tem duas linhas em `pagamentos` (item 8, docs/depois-do-teste.md). */
export const FORMA_PAGAMENTO_MISTA = 'misto';

export function quantidadeVenda(valor) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export class VendaItem {
  constructor({ id = null, produtoId, quantidade, precoUnitario }) {
    this.id = id;
    this.produtoId = Number(produtoId);
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0) {
      throw new QuantidadeItemInvalidaError();
    }
    this.quantidade = validarQuantidade(quantidade);
    this.precoUnitario = dinheiro(precoUnitario);
    this.subtotal = dinheiro(this.quantidade * this.precoUnitario);
  }

  static reconstituir({ id, produtoId, quantidade, precoUnitario, subtotal }) {
    const item = Object.create(VendaItem.prototype);
    item.id = id;
    item.produtoId = Number(produtoId);
    item.quantidade = quantidadeVenda(quantidade);
    item.precoUnitario = dinheiro(precoUnitario);
    item.subtotal = dinheiro(subtotal);
    return item;
  }
}

export class Venda {
  static reconstituir({
    id,
    numero,
    turnoId,
    usuarioId,
    formaPagamento,
    pagamentos,
    itens,
    total,
    status,
    motivoCancelamento,
    canceladoPor,
    canceladoEm,
    criadoEm,
  }) {
    const venda = Object.create(Venda.prototype);
    venda.id = id;
    venda.numero = Number(numero);
    venda.turnoId = Number(turnoId);
    venda.usuarioId = Number(usuarioId);
    venda.total = dinheiro(total);
    venda.pagamentos =
      Array.isArray(pagamentos) && pagamentos.length > 0
        ? pagamentos.map((p) => ({ formaPagamento: p.formaPagamento, valor: dinheiro(p.valor) }))
        : [{ formaPagamento, valor: venda.total }];
    venda.formaPagamento = derivarFormaPagamento(venda.pagamentos);
    venda.itens = (itens || []).map((item) => VendaItem.reconstituir(item));
    venda.status = status;
    venda.motivoCancelamento = motivoCancelamento;
    venda.canceladoPor = canceladoPor;
    venda.canceladoEm = canceladoEm;
    venda.criadoEm = criadoEm;
    return venda;
  }

  constructor({
    id = null,
    numero,
    turnoId,
    usuarioId,
    formaPagamento,
    pagamentos,
    itens,
    status = 'confirmada',
    motivoCancelamento = null,
    canceladoPor = null,
    canceladoEm = null,
    criadoEm = null,
    total: totalExterno,
  }) {
    if (totalExterno !== undefined) {
      throw new TotalExternoError();
    }

    this.id = id;
    this.numero = Number(numero);
    this.turnoId = Number(turnoId);
    if (!Number.isInteger(this.turnoId) || this.turnoId <= 0) {
      throw new TurnoObrigatorioError();
    }
    this.usuarioId = Number(usuarioId);
    if (!Number.isInteger(this.usuarioId) || this.usuarioId <= 0) {
      throw new TurnoObrigatorioError('Usuário executor é obrigatório.');
    }
    this.itens = montarItens(itens);
    this.total = calcularTotal(this.itens);
    this.pagamentos = montarPagamentos({ formaPagamento, pagamentos, total: this.total });
    this.formaPagamento = derivarFormaPagamento(this.pagamentos);
    this.status = status === 'cancelada' ? 'cancelada' : 'confirmada';
    this.motivoCancelamento = motivoCancelamento;
    this.canceladoPor = canceladoPor;
    this.canceladoEm = canceladoEm;
    this.criadoEm = criadoEm;
  }

  cancelar(motivo, canceladoPor) {
    this.status = 'cancelada';
    this.motivoCancelamento = String(motivo ?? '').trim();
    this.canceladoPor = Number(canceladoPor);
    this.canceladoEm = new Date();
    return this;
  }

  dataOperacao() {
    if (this.criadoEm instanceof Date) {
      return formatarData(this.criadoEm);
    }
    if (typeof this.criadoEm === 'string' && this.criadoEm.trim()) {
      return formatarData(new Date(this.criadoEm));
    }
    return dataHoje();
  }

  horaOperacao() {
    if (this.criadoEm instanceof Date) {
      return formatarHora(this.criadoEm);
    }
    if (typeof this.criadoEm === 'string' && this.criadoEm.trim()) {
      return formatarHora(new Date(this.criadoEm));
    }
    return 0;
  }

  paraPublico() {
    return {
      id: this.id,
      numero: this.numero,
      total: this.total,
      forma_pagamento: this.formaPagamento,
      pagamentos: this.pagamentos.map((p) => ({ forma_pagamento: p.formaPagamento, valor: p.valor })),
      status: this.status,
    };
  }

  paraListagem() {
    return {
      id: this.id,
      numero: this.numero,
      turno_id: this.turnoId,
      total: this.total,
      forma_pagamento: this.formaPagamento,
      pagamentos: this.pagamentos.map((p) => ({ forma_pagamento: p.formaPagamento, valor: p.valor })),
      status: this.status,
      criado_em: this.criadoEm,
    };
  }
}

function montarItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new CarrinhoVazioError();
  }
  return itens.map((item) => {
    if (item instanceof VendaItem) {
      return item;
    }
    return new VendaItem({
      produtoId: item.produtoId ?? item.produto_id,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario ?? item.preco_unitario,
    });
  });
}

function calcularTotal(itens) {
  const total = itens.reduce((acc, item) => acc + item.subtotal, 0);
  if (!(total > 0)) {
    throw new CarrinhoVazioError();
  }
  return dinheiro(total);
}

function validarQuantidade(quantidade) {
  const valor = quantidadeVenda(quantidade);
  if (!(valor > 0)) {
    throw new QuantidadeItemInvalidaError();
  }
  return valor;
}

function validarFormaPagamento(forma) {
  const valor = String(forma ?? '').trim().toLowerCase();
  if (!FORMAS_PAGAMENTO.includes(valor)) {
    throw new FormaPagamentoInvalidaError();
  }
  return valor;
}

/** No máximo duas linhas (item 8, docs/depois-do-teste.md) — soma sempre igual ao total dos itens. */
function montarPagamentos({ formaPagamento, pagamentos, total }) {
  if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
    return [{ formaPagamento: validarFormaPagamento(formaPagamento), valor: total }];
  }

  if (pagamentos.length > 2) {
    throw new PagamentosInvalidosError('No máximo duas formas de pagamento por venda.');
  }

  const linhas = pagamentos.map((p) => {
    const valor = dinheiro(p.valor ?? p.Valor);
    if (!(valor > 0)) {
      throw new PagamentosInvalidosError('O valor de cada forma de pagamento deve ser maior que zero.');
    }
    return { formaPagamento: validarFormaPagamento(p.formaPagamento ?? p.forma_pagamento), valor };
  });

  if (linhas.length === 2 && linhas[0].formaPagamento === linhas[1].formaPagamento) {
    throw new PagamentosInvalidosError('As duas formas de pagamento devem ser diferentes.');
  }

  const soma = dinheiro(linhas.reduce((acc, linha) => acc + linha.valor, 0));
  if (soma !== total) {
    throw new PagamentosInvalidosError('A soma dos pagamentos deve ser igual ao total da venda.');
  }

  return linhas;
}

function derivarFormaPagamento(pagamentos) {
  return pagamentos.length === 1 ? pagamentos[0].formaPagamento : FORMA_PAGAMENTO_MISTA;
}

function formatarData(valor) {
  if (valor instanceof Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Recife',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(valor);
  }
  return String(valor).slice(0, 10);
}

function formatarHora(valor) {
  if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) {
    return 0;
  }
  return Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Recife',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(valor),
  );
}
