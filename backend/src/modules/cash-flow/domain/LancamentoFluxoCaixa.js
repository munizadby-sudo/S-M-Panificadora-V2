import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';
import { TipoInvalidoError, TurnoObrigatorioError, ValorInvalidoError } from './erros.js';

export const TIPOS_LANCAMENTO = Object.freeze(['entrada', 'saida']);

export function formatarData(valor) {
  if (valor == null || valor === '') {
    throw new ValorInvalidoError('Data é obrigatória.');
  }
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  const texto = String(valor).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new ValorInvalidoError('Data inválida.');
  }
  return texto;
}

export function formatarDataFiltro(valor) {
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  const texto = String(valor ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new ValorInvalidoError('Data de filtro inválida.');
  }
  return texto;
}

export class LancamentoFluxoCaixa {
  static reconstituir({
    id,
    usuarioId,
    turnoId,
    tipo,
    descricao,
    categoria,
    forma,
    valor,
    data,
    geradoAuto = false,
    ativo = true,
    vendaId = null,
    criadoEm = null,
    excluidoPor = null,
    excluidoEm = null,
    motivoExclusao = null,
  }) {
    const lancamento = Object.create(LancamentoFluxoCaixa.prototype);
    lancamento.id = id;
    lancamento.usuarioId = Number(usuarioId);
    lancamento.turnoId = Number(turnoId);
    lancamento.tipo = validarTipo(tipo);
    lancamento.descricao = String(descricao ?? '').trim();
    lancamento.categoria = String(categoria ?? '').trim();
    lancamento.forma = String(forma ?? '').trim();
    lancamento.valor = validarValor(valor);
    lancamento.data = formatarData(data);
    lancamento.geradoAuto = Boolean(Number(geradoAuto));
    lancamento.ativo = Boolean(Number(ativo));
    lancamento.vendaId = vendaId == null ? null : Number(vendaId);
    lancamento.criadoEm = criadoEm;
    lancamento.excluidoPor = excluidoPor == null ? null : Number(excluidoPor);
    lancamento.excluidoEm = excluidoEm;
    lancamento.motivoExclusao = motivoExclusao;
    return lancamento;
  }

  constructor({
    id = null,
    usuarioId,
    turnoId,
    tipo,
    descricao,
    categoria,
    forma,
    valor,
    data,
    geradoAuto = false,
    ativo = true,
    vendaId = null,
    criadoEm = null,
  }) {
    this.id = id;
    this.usuarioId = Number(usuarioId);
    if (!Number.isInteger(this.usuarioId) || this.usuarioId <= 0) {
      throw new ValorInvalidoError('Usuário executor é obrigatório.');
    }
    this.turnoId = Number(turnoId);
    if (!Number.isInteger(this.turnoId) || this.turnoId <= 0) {
      throw new TurnoObrigatorioError();
    }
    this.tipo = validarTipo(tipo);
    this.descricao = String(descricao ?? '').trim();
    this.categoria = String(categoria ?? '').trim();
    this.forma = String(forma ?? '').trim();
    this.valor = validarValor(valor);
    this.data = formatarData(data);
    this.geradoAuto = Boolean(geradoAuto);
    this.ativo = Boolean(ativo);
    this.vendaId = vendaId == null ? null : Number(vendaId);
    this.criadoEm = criadoEm;
    this.excluidoPor = null;
    this.excluidoEm = null;
    this.motivoExclusao = null;
  }

  marcarExcluido({ excluidoPor, motivoExclusao, excluidoEm = new Date() }) {
    this.ativo = false;
    this.excluidoPor = Number(excluidoPor);
    this.excluidoEm = excluidoEm instanceof Date ? excluidoEm : new Date(excluidoEm);
    this.motivoExclusao = String(motivoExclusao ?? '').trim();
    return this;
  }

  paraCriacao() {
    return {
      id: this.id,
      turno_id: this.turnoId,
      tipo: this.tipo,
      valor: this.valor,
    };
  }

  paraListagem({ usuarioNome } = {}) {
    return {
      id: this.id,
      turno_id: this.turnoId,
      tipo: this.tipo,
      descricao: this.descricao,
      categoria: this.categoria,
      forma: this.forma,
      valor: this.valor,
      data: this.data,
      gerado_auto: this.geradoAuto ? 1 : 0,
      venda_id: this.vendaId,
      usuario: usuarioNome ?? null,
      ativo: this.ativo ? 1 : 0,
      criado_em: this.criadoEm,
    };
  }
}

function validarValor(valor) {
  const numero = dinheiro(valor);
  if (!(numero > 0)) {
    throw new ValorInvalidoError();
  }
  return numero;
}

function validarTipo(tipo) {
  const valor = String(tipo ?? '').trim().toLowerCase();
  if (!TIPOS_LANCAMENTO.includes(valor)) {
    throw new TipoInvalidoError();
  }
  return valor;
}
