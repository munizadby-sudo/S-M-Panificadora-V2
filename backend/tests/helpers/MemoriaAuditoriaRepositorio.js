export class MemoriaAuditoriaRepositorio {
  constructor() {
    this.registros = [];
    this.proximoId = 1;
  }

  async inserir(registro) {
    this.registros.push({
      id: this.proximoId,
      criado_em: new Date().toISOString(),
      ...registro,
    });
    this.proximoId += 1;
  }

  async listar({ entidade, entidadeId, usuarioId, acao, dataInicio, dataFim, page = 1, limit = 20 } = {}) {
    let filtrados = this.registros.filter((item) => {
      if (entidade && item.entidade !== entidade) {
        return false;
      }
      if (entidadeId !== undefined && entidadeId !== null && entidadeId !== '' && Number(item.entidadeId) !== Number(entidadeId)) {
        return false;
      }
      if (usuarioId !== undefined && usuarioId !== null && usuarioId !== '' && Number(item.usuarioId) !== Number(usuarioId)) {
        return false;
      }
      if (acao && item.acao !== acao) {
        return false;
      }
      const criado = item.criado_em ? new Date(item.criado_em) : null;
      if (dataInicio && criado && criado < new Date(dataInicio)) {
        return false;
      }
      if (dataFim && criado && criado > new Date(dataFim)) {
        return false;
      }
      return true;
    });

    filtrados = [...filtrados].sort((a, b) => b.id - a.id);
    const total = filtrados.length;
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const inicio = (pagina - 1) * limite;
    return { data: filtrados.slice(inicio, inicio + limite), total };
  }
}
