import 'dotenv/config';
import { Usuario } from '../../modules/users/domain/Usuario.js';
import {
  aplicarSchemaAuditoria,
  aplicarSchemaConfiguracoes,
  aplicarSchemaUsuarios,
  criarPool,
  garantirDatabase,
  semearConfiguracoes,
} from './db.js';
import { padroesParaSeed } from '../../modules/settings/domain/chaves.js';
import { BcryptHashService } from '../../modules/users/infrastructure/BcryptHashService.js';
import { MySQLUsuarioRepository } from '../../modules/users/infrastructure/MySQLUsuarioRepository.js';

await garantirDatabase();
const pool = criarPool();
await aplicarSchemaUsuarios(pool);
await aplicarSchemaConfiguracoes(pool);
await aplicarSchemaAuditoria(pool);
await semearConfiguracoes(pool, padroesParaSeed());

const repo = new MySQLUsuarioRepository(pool);
const hashService = new BcryptHashService();
const username = (process.env.ADMIN_SEED_USERNAME || 'admin').toLowerCase();
const senha = process.env.ADMIN_SEED_PASSWORD || 'admin123';

const existente = await repo.buscarPorUsername(username);
if (existente) {
  process.stdout.write(`Seed: usuário "${username}" já existe (id ${existente.id}).\n`);
  await pool.end();
  process.exit(0);
}

const admin = await repo.salvar(
  new Usuario({
    nome: process.env.ADMIN_SEED_NOME || 'Administrador',
    username,
    senhaHash: await hashService.hash(senha),
    role: 'admin',
  }),
);

process.stdout.write(`Seed: admin criado (id ${admin.id}, username ${admin.username}).\n`);
await pool.end();
