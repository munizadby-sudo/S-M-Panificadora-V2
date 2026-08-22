export class ClientesController {
  constructor({
    listClientes,
    createCliente,
    updateCliente,
    deactivateCliente,
    reactivateCliente,
  }) {
    this.listClientes = listClientes;
    this.createCliente = createCliente;
    this.updateCliente = updateCliente;
    this.deactivateCliente = deactivateCliente;
    this.reactivateCliente = reactivateCliente;
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listClientes.executar(req.query || {});
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
      const salvo = await this.createCliente.executar(req.body || {}, req.usuario, ipDaRequisicao(req));
      res.json(salvo.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async atualizar(req, res, next) {
    try {
      const salvo = await this.updateCliente.executar(
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
      await this.deactivateCliente.executar({ id: req.params.id }, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Cliente desativado.' });
    } catch (erro) {
      next(erro);
    }
  }

  async reativar(req, res, next) {
    try {
      await this.reactivateCliente.executar({ id: req.params.id }, req.usuario, ipDaRequisicao(req));
      res.json({ mensagem: 'Cliente reativado.' });
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
