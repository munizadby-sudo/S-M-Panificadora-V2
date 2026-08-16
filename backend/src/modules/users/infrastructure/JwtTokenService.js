import jwt from 'jsonwebtoken';
import { TokenService } from '../application/ports.js';

export class JwtTokenService extends TokenService {
  constructor({ secret, expiresIn = '12h' } = {}) {
    super();
    if (!secret) {
      throw new Error('JWT_SECRET é obrigatório');
    }
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  emitir(usuario) {
    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      username: usuario.username,
      role: usuario.role,
      permissoes: [...usuario.permissoes],
    };
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verificar(token) {
    return jwt.verify(token, this.secret);
  }
}
