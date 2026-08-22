export class ProducaoController {
  constructor({ createProducao, listProducao }) {
    this.createProducao = createProducao;
    this.listProducao = listProducao;
  }

  async criar(req, res, next) {
    try {
      const salva = await this.createProducao.executar(req.body || {}, req.usuario, ipDaRequisicao(req));
      res.json(salva.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listProducao.executar(req.query || {});
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
