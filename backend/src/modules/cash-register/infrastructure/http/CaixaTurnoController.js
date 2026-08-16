export class CaixaTurnoController {
  constructor({ getStatusCaixa, abrirCaixa, preverFechamento, fecharCaixa }) {
    this.getStatusCaixa = getStatusCaixa;
    this.abrirCaixa = abrirCaixa;
    this.preverFechamento = preverFechamento;
    this.fecharCaixa = fecharCaixa;
  }

  async status(_req, res, next) {
    try {
      res.json(await this.getStatusCaixa.executar());
    } catch (erro) {
      next(erro);
    }
  }

  async abrir(req, res, next) {
    try {
      res.json(await this.abrirCaixa.executar(req.body || {}, req.usuario, ipDaRequisicao(req)));
    } catch (erro) {
      next(erro);
    }
  }

  async preview(_req, res, next) {
    try {
      res.json(await this.preverFechamento.executar());
    } catch (erro) {
      next(erro);
    }
  }

  async fechar(req, res, next) {
    try {
      res.json(await this.fecharCaixa.executar(req.body || {}, req.usuario, ipDaRequisicao(req)));
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
