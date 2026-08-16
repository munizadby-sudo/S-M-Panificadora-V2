export class ListarAuditoria {
  constructor({ auditoriaRepositorio }) {
    this.auditoriaRepositorio = auditoriaRepositorio;
  }

  async executar({
    entidade,
    entidade_id: entidadeId,
    usuario_id: usuarioId,
    acao,
    data_inicio: dataInicio,
    data_fim: dataFim,
    page = 1,
    limit = 20,
  } = {}) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const { data, total } = await this.auditoriaRepositorio.listar({
      entidade: entidade || undefined,
      entidadeId: entidadeId === undefined || entidadeId === '' ? undefined : Number(entidadeId),
      usuarioId: usuarioId === undefined || usuarioId === '' ? undefined : Number(usuarioId),
      acao: acao || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      page: pagina,
      limit: limite,
    });
    const pages = Math.max(1, Math.ceil(total / limite) || 1);

    return {
      data: data.map(paraPublico),
      pagination: {
        page: pagina,
        limit: limite,
        total,
        pages,
        hasPrevious: pagina > 1,
        hasNext: pagina < pages && total > 0,
      },
    };
  }
}

function paraPublico(item) {
  return {
    id: item.id,
    usuario_id: item.usuarioId ?? item.usuario_id ?? null,
    acao: item.acao,
    entidade: item.entidade,
    entidade_id: item.entidadeId ?? item.entidade_id ?? null,
    ip: item.ip ?? null,
    criado_em: formatarData(item.criadoEm ?? item.criado_em),
  };
}

function formatarData(valor) {
  if (!valor) {
    return null;
  }
  if (valor instanceof Date) {
    return valor.toISOString();
  }
  return String(valor);
}
