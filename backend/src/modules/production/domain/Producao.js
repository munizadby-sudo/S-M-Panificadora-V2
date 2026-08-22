import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { QuantidadeInvalidaError } from '../../inventory/domain/erros.js';

export function quantidadeProducao(valor) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export class Producao {
  static reconstituir({ id, produtoId, data, quantidade, usuarioId, criadoEm = null }) {
    const producao = Object.create(Producao.prototype);
    producao.id = id;
    producao.produtoId = Number(produtoId);
    producao.data = String(data).slice(0, 10);
    producao.quantidade = quantidadeProducao(quantidade);
    producao.usuarioId = Number(usuarioId);
    producao.criadoEm = criadoEm;
    return producao;
  }

  constructor({ id = null, produtoId, data, quantidade, usuarioId, criadoEm = null }) {
    this.id = id;
    this.produtoId = Number(produtoId);
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0) {
      throw new QuantidadeInvalidaError('produto', 'Produto é obrigatório.');
    }
    this.data = normalizarData(data);
    this.quantidade = validarQuantidade(quantidade);
    this.usuarioId = Number(usuarioId);
    if (!Number.isInteger(this.usuarioId) || this.usuarioId <= 0) {
      throw new QuantidadeInvalidaError('usuario', 'Usuário executor é obrigatório.');
    }
    this.criadoEm = criadoEm;
  }

  paraPublico() {
    return {
      id: this.id,
      produto_id: this.produtoId,
      data: this.data,
      quantidade: this.quantidade,
      usuario_id: this.usuarioId,
    };
  }

  paraListagem({ produtoNome, usuarioNome }) {
    return {
      id: this.id,
      produto: produtoNome,
      data: this.data,
      quantidade: this.quantidade,
      usuario: usuarioNome,
    };
  }
}

function validarQuantidade(quantidade) {
  const valor = quantidadeProducao(quantidade);
  if (!(valor > 0)) {
    throw new QuantidadeInvalidaError('quantidade', 'Quantidade deve ser maior que zero.');
  }
  return valor;
}
