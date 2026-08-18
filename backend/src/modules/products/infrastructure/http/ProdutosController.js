export class ProdutosController {
  constructor({ listProdutos, createProduto, updateProduto, deactivateProduto, reactivateProduto }) {
    this.listProdutos = listProdutos;
    this.createProduto = createProduto;
    this.updateProduto = updateProduto;
    this.deactivateProduto = deactivateProduto;
    this.reactivateProduto = reactivateProduto;
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listProdutos.executar(req.query || {});
      res.json({
        data: resultado.data.map((item) => item.paraPublico()),
        pagination: resultado.pagination,
      });
    } catch (erro) {
      next(erro);
    }
  }

  async criar(req, res, next) {
    try {
      const salvo = await this.createProduto.executar(req.body || {}, req.usuario, ipDaRequisicao(req));
      res.json(salvo.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async atualizar(req, res, next) {
    try {
      const salvo = await this.updateProduto.executar(
        { id: req.params.id, ...(req.body || {}) },
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(salvo.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async desativar(req, res, next) {
    try {
      await this.deactivateProduto.executar({ id: req.params.id }, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Produto desativado.' });
    } catch (erro) {
      next(erro);
    }
  }

  async reativar(req, res, next) {
    try {
      await this.reactivateProduto.executar({ id: req.params.id }, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Produto reativado.' });
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
