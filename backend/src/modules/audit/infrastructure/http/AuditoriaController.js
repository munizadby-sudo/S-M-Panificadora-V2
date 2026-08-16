export class AuditoriaController {
  constructor(listarAuditoria) {
    this.listarAuditoria = listarAuditoria;
  }

  async listar(req, res, next) {
    try {
      res.json(await this.listarAuditoria.executar(req.query || {}));
    } catch (erro) {
      next(erro);
    }
  }
}
