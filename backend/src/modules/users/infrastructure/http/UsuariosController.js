export class UsuariosController {
  constructor({ listUsers, createUser, updateUser, deactivateUser }) {
    this.listUsers = listUsers;
    this.createUser = createUser;
    this.updateUser = updateUser;
    this.deactivateUser = deactivateUser;
  }

  async listar(req, res, next) {
    try {
      const { page, limit } = req.query;
      const resultado = await this.listUsers.executar({ page, limit });
      res.json({
        data: resultado.data.map((usuario) => usuario.paraPublico()),
        pagination: resultado.pagination,
      });
    } catch (erro) {
      next(erro);
    }
  }

  async criar(req, res, next) {
    try {
      const salvo = await this.createUser.executar(req.body || {}, req.usuario);
      res.json({ id: salvo.id, mensagem: 'Usuário criado.' });
    } catch (erro) {
      next(erro);
    }
  }

  async atualizar(req, res, next) {
    try {
      await this.updateUser.executar({ id: req.params.id, ...req.body }, req.usuario);
      res.json({ mensagem: 'Usuário atualizado.' });
    } catch (erro) {
      next(erro);
    }
  }

  async desativar(req, res, next) {
    try {
      await this.deactivateUser.executar(
        { usuarioAlvoId: Number(req.params.id) },
        req.usuario,
      );
      res.json({ mensagem: 'Usuário desativado.' });
    } catch (erro) {
      next(erro);
    }
  }
}
