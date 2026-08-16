export class AuthController {
  constructor(login) {
    this.login = login;
  }

  async entrar(req, res, next) {
    try {
      const { username, senha } = req.body || {};
      if (!username || !senha) {
        res.status(400).json({ erro: 'Informe usuário e senha.' });
        return;
      }

      const { token, usuario } = await this.login.executar({
        username,
        senha,
        ip: req.ip || null,
      });
      res.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          username: usuario.username,
          role: usuario.role,
          permissoes: [...usuario.permissoes],
        },
      });
    } catch (erro) {
      next(erro);
    }
  }
}
