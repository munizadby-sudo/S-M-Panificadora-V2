export class VendasController {
  constructor({ createSale, listSales, cancelSale, resolverCorrecaoPendente }) {
    this.createSale = createSale;
    this.listSales = listSales;
    this.cancelSale = cancelSale;
    this.resolverCorrecaoPendente = resolverCorrecaoPendente;
  }

  async criar(req, res, next) {
    try {
      const salva = await this.createSale.executar(req.body || {}, req.usuario, ipDaRequisicao(req));
      res.json(salva.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listSales.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async cancelar(req, res, next) {
    try {
      const resultado = await this.cancelSale.executar(
        { id: req.params.id, motivo: req.body?.motivo },
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async resolverCorrecao(req, res, next) {
    try {
      const resultado = await this.resolverCorrecaoPendente.executar(
        { id: req.params.id },
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
