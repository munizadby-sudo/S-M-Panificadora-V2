export class ConfiguracaoRepository {
  async listar() {
    throw new Error('ConfiguracaoRepository.listar não implementado');
  }

  async upsert(_chave, _valor, _atualizadoPor) {
    throw new Error('ConfiguracaoRepository.upsert não implementado');
  }
}
