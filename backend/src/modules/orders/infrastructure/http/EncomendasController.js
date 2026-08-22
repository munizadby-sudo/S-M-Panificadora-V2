export class EncomendasController {
  constructor({
    createEncomenda,
    updateEncomenda,
    updateStatusEncomenda,
    cancelEncomenda,
    listEncomendas,
    getEncomenda,
  }) {
    this.createEncomenda = createEncomenda;
    this.updateEncomenda = updateEncomenda;
    this.updateStatusEncomenda = updateStatusEncomenda;
    this.cancelEncomenda = cancelEncomenda;
    this.listEncomendas = listEncomendas;
    this.getEncomenda = getEncomenda;
  }

  async buscar(req, res, next) {
    try {
      const encomenda = await this.getEncomenda.executar(req.params.id);
      res.json(encomenda.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async criar(req, res, next) {
    try {
      const salva = await this.createEncomenda.executar(req.body || {}, req.usuario, ipDaRequisicao(req));
      res.json(salva.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async atualizar(req, res, next) {
    try {
      const salva = await this.updateEncomenda.executar(
        req.params.id,
        req.body || {},
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(salva.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async mudarStatus(req, res, next) {
    try {
      const salva = await this.updateStatusEncomenda.executar(
        req.params.id,
        req.body?.status,
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(salva.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async cancelar(req, res, next) {
    try {
      await this.cancelEncomenda.executar(req.params.id, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Encomenda cancelada.' });
    } catch (erro) {
      next(erro);
    }
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listEncomendas.executar(req.query || {});
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
