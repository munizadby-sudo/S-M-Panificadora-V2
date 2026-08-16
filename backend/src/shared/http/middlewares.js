export function autenticar(tokenService) {
  return (req, res, next) => {
    const header = String(req.headers.authorization || '');
    const [esquema, token] = header.split(' ');
    if (esquema !== 'Bearer' || !token) {
      res.status(401).json({ erro: 'Não autenticado.' });
      return;
    }

    try {
      req.usuario = tokenService.verificar(token);
      next();
    } catch {
      res.status(401).json({ erro: 'Não autenticado.' });
    }
  };
}

export function apenasAdmin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
    return;
  }
  next();
}

export function temPermissao(modulo) {
  return (req, res, next) => {
    const usuario = req.usuario;
    if (!usuario) {
      res.status(401).json({ erro: 'Não autenticado.' });
      return;
    }

    if (usuario.role === 'admin') {
      next();
      return;
    }

    const permissoes = lerPermissoesComDefesa(usuario.permissoes);
    if (!permissoes.includes(modulo)) {
      res.status(403).json({ erro: 'Permissão insuficiente.' });
      return;
    }

    next();
  };
}

function lerPermissoesComDefesa(valor) {
  try {
    if (Array.isArray(valor)) {
      return valor;
    }
    if (typeof valor === 'string') {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}
