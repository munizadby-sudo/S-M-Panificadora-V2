export class EstoqueController {
  constructor({ listarEstoqueDoDia, upsertEstoque, upsertEstoqueEmLote }) {
    this.listarEstoqueDoDia = listarEstoqueDoDia;
    this.upsertEstoque = upsertEstoque;
    this.upsertEstoqueEmLote = upsertEstoqueEmLote;
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listarEstoqueDoDia.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async upsert(req, res, next) {
    try {
      const salvo = await this.upsertEstoque.executar(
        { produtoId: req.params.produtoId, ...(req.body || {}) },
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(salvo.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async upsertLote(req, res, next) {
    try {
      const resultado = await this.upsertEstoqueEmLote.executar(
        req.body || {},
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }
}

function ipDaRequisicao(req) {
  const encaminhado = req.headers?.['x-forwarded-for'];
  if (typeof encaminhado === 'string' && encaminhado.trim()) {
    return encaminhado.split(',')[0].trim();
  }
  return req.ip || null;
}
