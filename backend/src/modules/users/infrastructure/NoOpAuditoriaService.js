import { AuditoriaService } from '../application/ports.js';

export class NoOpAuditoriaService extends AuditoriaService {
  async registrar() {}
}
