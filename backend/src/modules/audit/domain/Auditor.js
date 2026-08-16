export class Auditor {
  constructor({ repositorio, logger = console } = {}) {
    this.repositorio = repositorio;
    this.logger = logger;
  }

  async registrar({
    usuarioId = null,
    acao,
    entidade,
    entidadeId = null,
    estadoAntes = null,
    estadoDepois = null,
    ip = null,
  } = {}) {
    try {
      if (!this.repositorio) {
        return;
      }
      await this.repositorio.inserir({
        usuarioId: usuarioId ?? null,
        acao: String(acao || '').slice(0, 60),
        entidade: String(entidade || '').slice(0, 50),
        entidadeId: entidadeId ?? null,
        estadoAntes,
        estadoDepois,
        ip: ip == null ? null : String(ip).slice(0, 45),
      });
    } catch (erro) {
      this.logger.error('Falha ao registrar auditoria', erro);
    }
  }
}
