export class CategoriasController {
  constructor({ listCategorias, createCategoria, deactivateCategoria, reactivateCategoria }) {
    this.listCategorias = listCategorias;
    this.createCategoria = createCategoria;
    this.deactivateCategoria = deactivateCategoria;
    this.reactivateCategoria = reactivateCategoria;
  }

  async listar(req, res, next) {
    try {
      const lista = await this.listCategorias.executar({ ativo: req.query?.ativo });
      res.json({ data: lista.map((item) => item.paraPublico()) });
    } catch (erro) {
      next(erro);
    }
  }

  async criar(req, res, next) {
    try {
      const salva = await this.createCategoria.executar(req.body || {}, req.usuario, ipDaRequisicao(req));
      res.json(salva.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async desativar(req, res, next) {
    try {
      await this.deactivateCategoria.executar({ id: req.params.id }, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Categoria desativada.' });
    } catch (erro) {
      next(erro);
    }
  }

  async reativar(req, res, next) {
    try {
      await this.reactivateCategoria.executar({ id: req.params.id }, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Categoria reativada.' });
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
