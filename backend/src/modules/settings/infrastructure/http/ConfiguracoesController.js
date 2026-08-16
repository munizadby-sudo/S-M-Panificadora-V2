export class ConfiguracoesController {
  constructor({ getConfiguracoesPublicas, getConfiguracoes, updateConfiguracoes, uploadLogo }) {
    this.getConfiguracoesPublicas = getConfiguracoesPublicas;
    this.getConfiguracoes = getConfiguracoes;
    this.updateConfiguracoes = updateConfiguracoes;
    this.uploadLogo = uploadLogo;
  }

  async publico(_req, res, next) {
    try {
      res.json(await this.getConfiguracoesPublicas.executar());
    } catch (erro) {
      next(erro);
    }
  }

  async obter(_req, res, next) {
    try {
      res.json(await this.getConfiguracoes.executar());
    } catch (erro) {
      next(erro);
    }
  }

  async atualizar(req, res, next) {
    try {
      await this.updateConfiguracoes.executar(req.body || {}, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Configurações atualizadas.' });
    } catch (erro) {
      next(erro);
    }
  }

  async enviarLogo(req, res, next) {
    try {
      const resultado = await this.uploadLogo.executar(req.file, req.usuario, ipDaRequisicao(req));
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }
}

export function ipDaRequisicao(req) {
  const encaminhado = req.headers?.['x-forwarded-for'];
  if (typeof encaminhado === 'string' && encaminhado.trim()) {
    return encaminhado.split(',')[0].trim();
  }
  return req.ip || null;
}
