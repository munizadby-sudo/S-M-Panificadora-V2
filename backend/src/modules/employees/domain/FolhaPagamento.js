import { dinheiro } from '../../products/domain/Produto.js';
import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { calcularFolha } from './calcularFolha.js';
import { PeriodoFolhaInvalidoError } from './erros.js';

export class FolhaPagamento {
  constructor({
    id = null,
    funcionarioId,
    periodoInicio,
    periodoFim,
    salarioBase,
    totalAdiantamentos = 0,
    totalFaltas = 0,
    totalHorasExtras = 0,
    valorLiquido = null,
    status = 'pendente',
    pagoEm = null,
    usuarioId,
    criadoEm = null,
  }) {
    this.id = id;
    this.funcionarioId = Number(funcionarioId);
    this.periodoInicio = normalizarData(periodoInicio);
    this.periodoFim = normalizarData(periodoFim);
    if (this.periodoInicio > this.periodoFim) {
      throw new PeriodoFolhaInvalidoError('periodo_inicio deve ser anterior ou igual a periodo_fim.');
    }

    const calculo = calcularFolha({
      salarioBase,
      totalAdiantamentos,
      totalFaltas,
      totalHorasExtras,
    });

    this.salarioBase = calculo.salario_base;
    this.totalAdiantamentos = calculo.total_adiantamentos;
    this.totalFaltas = calculo.total_faltas;
    this.totalHorasExtras = calculo.total_horas_extras;
    this.valorLiquido =
      valorLiquido == null ? calculo.valor_liquido : dinheiro(valorLiquido);
    this.status = status === 'paga' ? 'paga' : 'pendente';
    this.pagoEm = pagoEm;
    this.usuarioId = Number(usuarioId);
    this.criadoEm = criadoEm;
  }

  marcarComoPaga(quando = new Date()) {
    if (this.status === 'paga') {
      return this;
    }
    this.status = 'paga';
    this.pagoEm = quando instanceof Date ? quando.toISOString() : String(quando);
    return this;
  }

  paraPublico({ funcionarioNome } = {}) {
    return {
      id: this.id,
      funcionario_id: this.funcionarioId,
      funcionario_nome: funcionarioNome ?? null,
      periodo_inicio: this.periodoInicio,
      periodo_fim: this.periodoFim,
      salario_base: this.salarioBase,
      total_adiantamentos: this.totalAdiantamentos,
      total_faltas: this.totalFaltas,
      total_horas_extras: this.totalHorasExtras,
      valor_liquido: this.valorLiquido,
      status: this.status,
      pago_em: this.pagoEm,
      usuario_id: this.usuarioId,
      criado_em: this.criadoEm,
    };
  }
}
