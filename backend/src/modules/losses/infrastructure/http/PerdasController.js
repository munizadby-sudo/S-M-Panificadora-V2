export class PerdasController {
  constructor({ createPerda, listPerdas, estornarPerda }) {
    this.createPerda = createPerda;
    this.listPerdas = listPerdas;
    this.estornarPerda = estornarPerda;
  }

  async criar(req, res, next) {
    try {
      const salva = await this.createPerda.executar(req.body || {}, req.usuario, ipDaRequisicao(req));
      res.json(salva.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listPerdas.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async estornar(req, res, next) {
    try {
      await this.estornarPerda.executar({ id: req.params.id }, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Perda estornada. Estoque revertido.' });
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
