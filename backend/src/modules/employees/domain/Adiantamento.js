import { dinheiro } from '../../products/domain/Produto.js';
import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { ValorAdiantamentoInvalidoError } from './erros.js';

export class Adiantamento {
  constructor({
    id = null,
    funcionarioId,
    valor,
    data,
    observacao = null,
    usuarioId,
    criadoEm = null,
  }) {
    this.id = id;
    this.funcionarioId = Number(funcionarioId);
    this.valor = validarValor(valor);
    this.data = normalizarData(data);
    this.observacao = normalizarObservacao(observacao);
    this.usuarioId = Number(usuarioId);
    this.criadoEm = criadoEm;
  }

  paraPublico({ funcionarioNome } = {}) {
    return {
      id: this.id,
      funcionario_id: this.funcionarioId,
      funcionario_nome: funcionarioNome ?? null,
      valor: this.valor,
      data: this.data,
      observacao: this.observacao,
      usuario_id: this.usuarioId,
      criado_em: this.criadoEm,
    };
  }
}

function validarValor(valor) {
  const numero = dinheiro(valor);
  if (!(numero > 0)) {
    throw new ValorAdiantamentoInvalidoError();
  }
  return numero;
}

function normalizarObservacao(observacao) {
  if (observacao == null || observacao === '') {
    return null;
  }
  return String(observacao).trim() || null;
}
