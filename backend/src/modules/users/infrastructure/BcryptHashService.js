import bcrypt from 'bcryptjs';
import { HashService } from '../application/ports.js';

const CUSTO = 10;

export class BcryptHashService extends HashService {
  async hash(senha) {
    return bcrypt.hash(String(senha), CUSTO);
  }

  async conferir(senha, senhaHash) {
    return bcrypt.compare(String(senha), String(senhaHash));
  }
}
