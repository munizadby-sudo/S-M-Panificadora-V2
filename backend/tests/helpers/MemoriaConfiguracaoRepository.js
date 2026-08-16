import { padroesParaSeed } from '../../src/modules/settings/domain/chaves.js';

export class MemoriaConfiguracaoRepository {
  constructor(iniciais = padroesParaSeed()) {
    this.linhas = new Map();
    for (const item of iniciais) {
      this.linhas.set(item.chave, {
        chave: item.chave,
        valor: item.valor,
        atualizado_por: item.atualizado_por ?? null,
      });
    }
  }

  async listar() {
    return [...this.linhas.values()].map((linha) => ({ ...linha }));
  }

  async upsert(chave, valor, atualizadoPor) {
    this.linhas.set(chave, {
      chave,
      valor: valor == null ? '' : String(valor),
      atualizado_por: atualizadoPor ?? null,
    });
  }
}
