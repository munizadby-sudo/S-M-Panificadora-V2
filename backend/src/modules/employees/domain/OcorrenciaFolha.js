import { dinheiro } from '../../products/domain/Produto.js';
import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import {
  MotivoOcorrenciaInvalidoError,
  TipoOcorrenciaInvalidoError,
  ValorOcorrenciaInvalidoError,
} from './erros.js';

export const TIPOS_OCORRENCIA = Object.freeze([
  'falta',
  'atestado',
  'hora_extra',
  'nao_cumprimento',
]);

export const MOTIVOS_NAO_CUMPRIMENTO = Object.freeze([
  'nao_limpou_producao',
  'nao_limpou_cozinha',
  'producao_incorreta',
]);

export const ROTULOS_MOTIVO_NAO_CUMPRIMENTO = Object.freeze({
  nao_limpou_producao: 'Não limparam a produção',
  nao_limpou_cozinha: 'Não limparam a cozinha',
  producao_incorreta: 'Não fizeram a produção correta',
});

export class OcorrenciaFolha {
  constructor({
    id = null,
    funcionarioId,
    tipo,
    data,
    valor = 0,
    motivo = null,
    observacao = null,
    usuarioId,
    criadoEm = null,
  }) {
    this.id = id;
    this.funcionarioId = Number(funcionarioId);
    this.tipo = validarTipo(tipo);
    this.data = normalizarData(data);
    this.valor = normalizarValor(this.tipo, valor);
    this.motivo = normalizarMotivo(this.tipo, motivo);
    this.observacao = normalizarObservacao(observacao);
    this.usuarioId = Number(usuarioId);
    this.criadoEm = criadoEm;
  }

  paraPublico({ funcionarioNome } = {}) {
    return {
      id: this.id,
      funcionario_id: this.funcionarioId,
      funcionario_nome: funcionarioNome ?? null,
      tipo: this.tipo,
      data: this.data,
      valor: this.valor,
      motivo: this.motivo,
      motivo_rotulo: this.motivo ? ROTULOS_MOTIVO_NAO_CUMPRIMENTO[this.motivo] : null,
      observacao: this.observacao,
      usuario_id: this.usuarioId,
      criado_em: this.criadoEm,
    };
  }
}

function validarTipo(tipo) {
  const valor = String(tipo ?? '').trim().toLowerCase();
  if (!TIPOS_OCORRENCIA.includes(valor)) {
    throw new TipoOcorrenciaInvalidoError();
  }
  return valor;
}

function normalizarMotivo(tipo, motivo) {
  if (tipo !== 'nao_cumprimento') {
    return null;
  }
  const valor = String(motivo ?? '').trim().toLowerCase();
  if (!MOTIVOS_NAO_CUMPRIMENTO.includes(valor)) {
    throw new MotivoOcorrenciaInvalidoError();
  }
  return valor;
}

function normalizarValor(tipo, valor) {
  if (tipo === 'atestado') {
    return 0;
  }
  const numero = dinheiro(valor);
  if (numero < 0) {
    throw new ValorOcorrenciaInvalidoError();
  }
  return numero;
}

function normalizarObservacao(observacao) {
  if (observacao == null || observacao === '') {
    return null;
  }
  return String(observacao).trim() || null;
}
